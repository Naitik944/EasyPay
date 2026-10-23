const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const html = readFileSync(path.join(__dirname, "index.html"), "utf8");
const source = readFileSync(process.env.EASYPAY_SCRIPT_PATH || path.join(__dirname, "script.js"), "utf8");
const alice = { user: { id: "alice", email: "alice@example.test" }, access_token: "local-alice-token" };
const bob = { user: { id: "bob", email: "bob@example.test" }, access_token: "local-bob-token" };
const deferred = () => {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
};
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const tick = () => new Promise((resolve) => setImmediate(resolve));

// The fixture exposes only the browser operations used by script.js. Form controls
// come from index.html so resets exercise the real form/field associations.
function browser() {
    class Element {
        constructor() {
            this.value = "";
            this.dataset = {};
            this.children = [];
            this._text = "";
            const classes = new Set();
            this.classList = {
                add: (name) => classes.add(name),
                remove: (name) => classes.delete(name),
                contains: (name) => classes.has(name),
                toggle(name, force = !classes.has(name)) {
                    if (force) classes.add(name); else classes.delete(name);
                },
            };
        }
        set textContent(value) { this._text = value; this.children = []; }
        get textContent() { return this._text + this.children.map((child) => child.textContent).join(""); }
        set innerHTML(value) { this.textContent = value; }
        get innerHTML() { return this.textContent; }
        appendChild(child) { this.children.push(child); return child; }
        append(...children) { this.children.push(...children); }
        replaceChildren(...children) { this._text = ""; this.children = children; }
        addEventListener(name, callback) { this[name] = callback; }
        focus() {}
    }
    const elements = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, new Element()]));
    for (const [, form, contents] of html.matchAll(/<form id="([^"]+)"[^>]*>([\s\S]*?)<\/form>/g)) {
        const controls = [...contents.matchAll(/<input id="([^"]+)"/g)].map(([, id]) => elements[id]);
        elements[form].reset = () => controls.forEach((input) => { input.value = ""; });
    }
    const timers = new Map();
    let timerId = 0;
    const channels = [];
    const requests = [];
    const env = { elements, timers, channels, requests, session: null, signOutCalls: 0, speechCancels: 0 };
    const client = {
        auth: {
            getSession: async () => ({ data: { session: env.session } }),
            signOut: async () => { env.signOutCalls += 1; },
        },
        channel: () => {
            const channel = {
                callbacks: [],
                on(_type, _filter, callback) { this.callbacks.push(callback); return this; },
                subscribe(callback) { this.status = callback; return this; },
            };
            channels.push(channel);
            return channel;
        },
        removeChannel: async () => {},
    };
    const window = {
        location: { origin: "http://localhost", pathname: "/" },
        setTimeout: (callback) => { timers.set(++timerId, callback); return timerId; },
        setInterval: (callback) => { timers.set(++timerId, callback); return timerId; },
        clearTimeout: (id) => timers.delete(id),
        clearInterval: (id) => timers.delete(id),
        speechSynthesis: { cancel: () => { env.speechCancels += 1; } },
        confirm: () => { throw new Error("Unexpected payment confirmation"); },
    };
    const context = vm.createContext({
        window, Headers, console, Error,
        document: {
            getElementById: (id) => elements[id] || null,
            createElement: () => new Element(),
            addEventListener() {},
            querySelectorAll: (selector) => selector === ".page"
                ? Object.entries(elements).filter(([id]) => id.startsWith("page-")).map(([, element]) => element)
                : [],
        },
        fetch: async (url, options) => {
            requests.push({ url, options });
            return env.fetch ? env.fetch(url, options) : response({});
        },
    });
    vm.runInContext(source, context);
    env.run = (code) => vm.runInContext(code, context);
    env.client = client;
    env.window = window;
    context.testClient = client;
    env.run("supabaseClient = testClient; publicConfig = { razorpay_key_id: 'local-test-key' };");
    env.enter = async (session) => {
        env.session = session;
        context.testSession = session;
        await env.run("enterApp(testSession)");
    };
    return env;
}

for (const [operation, prefix] of [["signIn", "signin"], ["signUp", "signup"]]) {
    test(`${operation} clears the password before awaiting authentication, including failures`, async () => {
        const env = browser();
        const pending = deferred();
        env.elements[`${prefix}-email`].value = alice.user.email;
        env.elements[`${prefix}-password`].value = "synthetic-password";
        env.elements["signup-name"].value = "Alice";
        let submitted;
        env.client.auth[operation === "signIn" ? "signInWithPassword" : "signUp"] = (credentials) => {
            submitted = credentials;
            return pending.promise;
        };
        const task = env.run(`${operation}({ preventDefault() {} })`);
        assert.equal(env.elements[`${prefix}-password`].value, "");
        assert.equal(submitted.password, "synthetic-password");
        pending.resolve({ error: new Error("Authentication rejected") });
        await task;
        assert.equal(env.elements[`${prefix}-password`].value, "");
        assert.equal(env.elements["auth-message"].textContent, "Authentication rejected");
        assert.equal(env.elements[`${prefix}-btn`].disabled, false);
    });
}

test("invalid auth submissions also erase passwords", async () => {
    const env = browser();
    for (const [operation, prefix] of [["signIn", "signin"], ["signUp", "signup"]]) {
        env.elements[`${prefix}-password`].value = "short";
        await env.run(`${operation}({ preventDefault() {} })`);
        assert.equal(env.elements[`${prefix}-password`].value, "");
    }
});

test("logout clears credentials and account data before remote sign-out completes", async () => {
    const env = browser();
    await env.enter(alice);
    for (const id of ["signin-email", "signin-password", "signup-name", "signup-email", "signup-password", "ai-input", "vendor-name", "vendor-upi", "vendor-note", "vendor-amount", "recharge-amount"]) {
        env.elements[id].value = "Alice private data";
    }
    env.run(`appendMessage("user", "Alice private chat"); renderAccount({ profile: { balance: 42 }, transactions: [{ description: "Alice transaction", amount: -5 }] }); showToast("Alice toast"); showConfirmModal(true); setVoiceBubble("Alice voice"); scheduleDashboardRefresh();`);
    env.elements["recent-vendors-list"].textContent = "Alice merchant";
    const pending = deferred();
    env.client.auth.signOut = () => pending.promise;
    const signingOut = env.run("signOut()");
    assert.equal(env.elements["auth-screen"].classList.contains("hidden"), false);
    assert.equal(env.elements["app-shell"].classList.contains("hidden"), true);
    for (const id of ["signin-email", "signin-password", "signup-name", "signup-email", "signup-password", "ai-input", "vendor-name", "vendor-upi", "vendor-note", "vendor-amount", "recharge-amount"]) {
        assert.equal(env.elements[id].value, "", id);
    }
    for (const id of ["sidebar-email", "sidebar-name", "settings-email", "ai-messages", "history-transactions", "recent-transactions", "recent-vendors-list", "toast", "voice-status"]) {
        assert.doesNotMatch(env.elements[id].textContent, /Alice|alice/);
    }
    assert.equal(env.elements["confirm-modal"].classList.contains("hidden"), true);
    assert.equal(env.run("lastAccount"), null);
    assert.equal(env.run("currentSession"), null);
    assert.equal(env.timers.size, 0);
    pending.resolve();
    await signingOut;
});

test("account switches clear chat while same-account auth refreshes preserve it", async () => {
    const env = browser();
    await env.enter(alice);
    env.run('appendMessage("user", "Alice private chat")');
    await env.enter({ ...alice, access_token: "refreshed-local-token" });
    assert.match(env.elements["ai-messages"].textContent, /Alice private chat/);
    await env.enter(bob);
    assert.doesNotMatch(env.elements["ai-messages"].textContent, /Alice private chat/);
    assert.equal(env.elements["sidebar-email"].textContent, bob.user.email);
});

for (const flow of ["loadDashboard(true)", "loadInsight()", 'submitAiPrompt("private prompt", true)', "loadRecentVendors()", 'executeVendorPayment("Private vendor", 5)', "startRecharge()"]) {
    test(`${flow} discards responses after logout and same-account reentry`, async () => {
        const env = browser();
        await env.enter(alice);
        env.elements["recharge-amount"].value = "10";
        env.window.Razorpay = function () { throw new Error("Stale checkout opened"); };
        const pending = deferred();
        env.fetch = () => pending.promise;
        const task = env.run(flow);
        await tick();
        env.run("leaveApp()");
        env.fetch = undefined;
        await env.enter(alice);
        const currentChat = env.elements["ai-messages"].textContent;
        const requestCount = env.requests.length;
        pending.resolve(response({
            profile: { balance: 9876 }, transactions: [{ description: "Old transaction", amount: 10 }],
            answer: "Old private answer", type: "action", action: { name: "recharge", amount: 10 },
        }));
        await task;
        assert.equal(env.elements["ai-messages"].textContent, currentChat);
        assert.doesNotMatch(env.elements["balance-value"].textContent, /9,876/);
        assert.equal(env.elements["recent-vendors-list"].textContent, "");
        assert.equal(env.elements["toast"].textContent, "");
        assert.equal(env.requests.length, requestCount, "No follow-up request from old session");
    });
}

test("a stale 401 cannot sign out the next account, including delayed JSON parsing", async () => {
    const env = browser();
    await env.enter(alice);
    const body = deferred();
    env.fetch = async () => ({ ok: false, status: 401, json: () => body.promise });
    const task = env.run("loadDashboard()");
    await tick();
    env.fetch = undefined;
    await env.enter(bob);
    body.resolve({ detail: "Alice private error" });
    await task;
    assert.equal(env.signOutCalls, 0);
    assert.equal(env.run("currentUser.id"), "bob");
    assert.equal(env.elements["toast"].textContent, "");
});

test("a pending token lookup cannot send an old payment as the next account", async () => {
    const env = browser();
    await env.enter(alice);
    const pending = deferred();
    const originalGetSession = env.client.auth.getSession;
    env.client.auth.getSession = () => pending.promise;
    const task = env.run('executeVendorPayment("Alice vendor", 25)');
    env.client.auth.getSession = originalGetSession;
    await env.enter(bob);
    const requestCount = env.requests.length;
    pending.resolve({ data: { session: bob } });
    await task;
    assert.equal(env.requests.length, requestCount);
    assert.equal(env.run("currentSession.user.id"), "bob");
});

test("logout closes checkout and ignores its later payment callback", async () => {
    const env = browser();
    await env.enter(alice);
    let checkoutOptions, closed = false;
    env.window.Razorpay = function (options) {
        checkoutOptions = options;
        this.open = () => {};
        this.close = () => { closed = true; };
    };
    env.elements["recharge-amount"].value = "10";
    await env.run("startRecharge()");
    env.run("leaveApp()");
    await env.enter(bob);
    const requestCount = env.requests.length;
    await checkoutOptions.handler({ razorpay_payment_id: "synthetic-payment" });
    assert.equal(closed, true);
    assert.equal(env.requests.length, requestCount);
});

test("old realtime events and timers cannot update a new session", async () => {
    const env = browser();
    await env.enter(alice);
    const oldChannel = env.channels[0];
    const oldTimers = [...env.timers.values()];
    await env.enter(bob);
    const status = env.elements["realtime-status"].textContent;
    const requestCount = env.requests.length;
    const timerCount = env.timers.size;
    oldChannel.status("SUBSCRIBED");
    oldChannel.callbacks.forEach((callback) => callback());
    oldTimers.forEach((callback) => callback());
    await tick();
    assert.equal(env.elements["realtime-status"].textContent, status);
    assert.equal(env.requests.length, requestCount);
    assert.equal(env.timers.size, timerCount);
});

test("late voice results are discarded after recognition is aborted at logout", async () => {
    const env = browser();
    await env.enter(alice);
    let recognition, aborted = false;
    env.window.SpeechRecognition = function () {
        recognition = this;
        this.start = () => {};
        this.abort = () => { aborted = true; };
    };
    // Omit synthesis so the initial greeting resolves immediately.
    env.window.speechSynthesis = null;
    const task = env.run("startVoiceAssistant()");
    await tick();
    env.run("leaveApp()");
    await env.enter(bob);
    const requestCount = env.requests.length;
    recognition.onresult({ results: [[{ transcript: "Alice private voice prompt" }]] });
    await task;
    assert.equal(aborted, true);
    assert.equal(env.requests.length, requestCount);
    assert.doesNotMatch(env.elements["ai-messages"].textContent, /Alice private/);
    assert.equal(env.elements["voice-status"].textContent, "");
});

test("authentication completed after logout cannot restore the old UI session", async () => {
    const env = browser();
    const pending = deferred();
    env.elements["signin-email"].value = alice.user.email;
    env.elements["signin-password"].value = "synthetic-password";
    env.client.auth.signInWithPassword = () => pending.promise;
    const task = env.run("signIn({ preventDefault() {} })");
    env.run("leaveApp()");
    pending.resolve({ data: { session: alice } });
    await task;
    assert.equal(env.run("currentUser"), null);
    assert.equal(env.elements["auth-screen"].classList.contains("hidden"), false);
});

for (const [operation, method] of [["signIn", "signInWithPassword"], ["signUp", "signUp"]]) {
    test(`${operation} still loads the authenticated wallet and cannot reuse credentials after logout`, async () => {
        const env = browser();
        for (const prefix of ["signin", "signup"]) {
            env.elements[`${prefix}-email`].value = alice.user.email;
            env.elements[`${prefix}-password`].value = "synthetic-password";
        }
        env.elements["signup-name"].value = "Alice";
        let authCalls = 0;
        env.client.auth[method] = async ({ email, password }) => {
            authCalls += 1;
            assert.equal(email, alice.user.email);
            assert.equal(password, "synthetic-password");
            env.session = alice;
            return { data: { session: alice } };
        };
        env.fetch = async (url) => url.endsWith("/account")
            ? response({ profile: { balance: 42 }, transactions: [{ description: "Current transaction", amount: 42 }] })
            : response({ answer: "Current account insight" });
        await env.run(`${operation}({ preventDefault() {} })`);
        await tick();
        assert.equal(env.elements["app-shell"].classList.contains("hidden"), false);
        assert.equal(env.run("lastAccount.profile.balance"), 42);
        assert.match(env.elements["recent-transactions"].textContent, /Current transaction/);
        assert.match(env.elements["ai-messages"].textContent, /Current account insight/);
        assert.equal(env.requests[0].options.headers.get("Authorization"), `Bearer ${alice.access_token}`);
        for (const prefix of ["signin", "signup"]) {
            assert.equal(env.elements[`${prefix}-email`].value, "");
            assert.equal(env.elements[`${prefix}-password`].value, "");
            assert.equal(env.elements[`${prefix}-btn`].disabled, false);
        }
        await env.run("signOut()");
        await env.run(`${operation}({ preventDefault() {} })`);
        assert.equal(authCalls, 1, "Cleared credentials cannot be resubmitted");
        assert.equal(env.run("currentUser"), null);
    });
}

test("signup still reports email confirmation when no session is created", async () => {
    const env = browser();
    env.elements["signup-name"].value = "Alice";
    env.elements["signup-email"].value = alice.user.email;
    env.elements["signup-password"].value = "synthetic-password";
    env.client.auth.signUp = async () => ({ data: { session: null } });
    await env.run("signUp({ preventDefault() {} })");
    assert.match(env.elements["auth-message"].textContent, /Check your email/);
    assert.equal(env.elements["signup-password"].value, "");
    assert.equal(env.run("currentUser"), null);
});
