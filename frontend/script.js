const API_BASE = "http://localhost:8000";
const SUPABASE_URL = "https://trtpawzizuhggzumxphv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRydHBhd3ppenVoZ2d6dW14cGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NTUyODYsImV4cCI6MjEwNzUzMTI4Nn0.3gZvh-dyqtelQEQBovclZu-kqY9XavNoOzmmquH7VkY";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let currentUser = null;

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = item.getAttribute('data-page');
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(`page-${pageId}`).classList.add('active');
    });
});

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert("Please fill in all fields");
        return;
    }

    try {
        // Using REAL Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        currentUser = { user_id: data.user.id, name: data.user.email };
        document.getElementById('page-login').classList.remove('active');
        document.getElementById('app-container').classList.remove('hidden');
        
        // Setup Realtime Subscription for the balance
        setupRealtime();
        loadDashboard();
    } catch (error) {
        alert("Login failed: " + error.message);
    }
}

function setupRealtime() {
    supabase
      .channel('any')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, payload => {
        console.log('Real-time update received!');
        loadDashboard();
      })
      .subscribe();
}

async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/account`);
        if (!response.ok) throw new Error("Account load failed");
        const data = await response.json();

        const symbol = data.balance.currency || '₹';
        document.getElementById('balance-val').textContent = `${symbol} ${data.balance.balance.toLocaleString()}`;
        document.getElementById('income-val').textContent = `${symbol} 0.00`;
        document.getElementById('expenses-val').textContent = `${symbol} 0.00`;

        if (data.insight) {
            document.getElementById('ai-insight-window').innerHTML = `
                <div class="ai-msg">${data.insight}</div>
            `;
        }

        const tbody = document.getElementById('transaction-body');
        const fullTbody = document.getElementById('full-history-body');
        tbody.innerHTML = '';
        if (fullTbody) fullTbody.innerHTML = '';
        
        if (data.transactions && data.transactions.length > 0) {
            data.transactions.forEach(t => {
                const row = createTransactionRow(t);
                tbody.appendChild(row.cloneNode(true));
                if (fullTbody) fullTbody.appendChild(row);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">No transactions found.</td></tr>';
            if (fullTbody) fullTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">No transactions found.</td></tr>';
        }
    } catch (error) {
        console.error("Error loading dashboard:", error);
    }
}

function createTransactionRow(t) {
    const row = document.createElement('tr');
    const amountClass = t.amount > 0 ? 'amount-pos' : 'amount-neg';
    const amountPrefix = t.amount > 0 ? '+' : '';
    
    row.innerHTML = `
        <td>
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:32px; height:32px; background:#e2e8f0; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:bold;">${t.description[0]}</div>
                ${t.description}
            </div>
        </td>
        <td><span style="font-size:0.8rem; color:#64748b;">${t.category}</span></td>
        <td><span style="font-size:0.8rem; color:var(--primary); font-weight:600;">${t.ai_model || 'None'}</span></td>
        <td style="color:#64748b; font-size:0.85rem;">${t.date}</td>
        <td class="${amountClass}">${amountPrefix}${t.amount.toFixed(2)}</td>
    `;
    return row;
}

async function sendAiQuery(promptInputId, windowId, sendBtnId) {
    const promptInput = document.getElementById(promptInputId);
    const prompt = promptInput.value.trim();

    if (!prompt) return;

    appendMessage(windowId, "You", prompt, "user-msg");
    promptInput.value = "";

    try {
        const response = await fetch(`${API_BASE}/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt,
                lang: 'en'
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "AI response failed");
        }

        const data = await response.json();
        
        if (data.type === 'command') {
            const cmd = data.data;
            if (cmd.action === 'pay') {
                appendMessage(windowId, "EasyPay AI", `Executing payment of ₹${cmd.amount} to ${cmd.vendor}...`, "ai-msg");
                await handleVendorPayment(cmd.vendor, cmd.amount);
            } else if (cmd.action === 'recharge') {
                appendMessage(windowId, "EasyPay AI", `Starting recharge of ₹${cmd.amount}...`, "ai-msg");
                document.getElementById('recharge-amount').value = cmd.amount;
                handleRecharge();
            } else if (cmd.action === 'refund') {
                appendMessage(windowId, "EasyPay AI", "Processing your refund request...", "ai-msg");
                await handleRefund();
            }
        } else {
            appendMessage(windowId, "EasyPay AI", data.answer, "ai-msg");
        }
    } catch (error) {
        console.error("AI Query Error:", error);
        appendMessage(windowId, "System", "Error: " + error.message, "ai-msg");
    }
}

async function handleRecharge() {
    const amount = document.getElementById('recharge-amount').value;
    if (!amount || amount <= 0) {
        alert("Please enter a valid amount");
        return;
    }

    try {
        const configResponse = await fetch(`${API_BASE}/config`);
        const config = await configResponse.json();
        const razorpayKey = config.razorpay_key_id;

        const response = await fetch(`${API_BASE}/recharge/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: parseFloat(amount),
                user_id: currentUser.user_id
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Order creation failed");
        }

        const order = await response.json();

        const options = {
            "key": razorpayKey,
            "amount": order.amount * 100,
            "currency": "INR",
            "name": "EasyPay",
            "description": "Wallet Recharge",
            "order_id": order.order_id,
            "handler": async function (response) {
                try {
                    const verifyRes = await fetch(`${API_BASE}/recharge/verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            payment_id: response.razorpay_payment_id,
                            amount: parseFloat(document.getElementById('recharge-amount').value),
                            user_id: currentUser.user_id
                        })
                    });
                    if (verifyRes.ok) {
                        alert("Recharge Successful! Your balance has been updated.");
                        loadDashboard();
                    }
                } catch (e) {
                    alert("Payment confirmed, but balance update failed.");
                }
            },
            "prefill": {
                "name": currentUser.name,
                "email": "naitik@example.com",
                "contact": "9999999999"
            },
            "theme": {
                "color": "#2563eb"
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();
    } catch (error) {
        alert(error.message || "Error initiating payment");
        console.error(error);
    }
}

async function handleVendorPayment(vendorName, amount) {
    try {
        const response = await fetch(`${API_BASE}/pay-vendor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: parseFloat(amount),
                vendor_name: vendorName,
                user_id: currentUser.user_id
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            loadDashboard();
            return true;
        } else {
            alert(data.detail || "Payment failed");
            return false;
        }
    } catch (error) {
        alert("Error processing payment");
        console.error(error);
        return false;
    }
}

async function handleRefund() {
    try {
        const response = await fetch(`${API_BASE}/refund`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.user_id
            })
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            loadDashboard();
            return true;
        } else {
            alert(data.detail || "Refund failed");
            return false;
        }
    } catch (error) {
        alert("Error processing refund");
        console.error(error);
        return false;
    }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = window.speechSynthesis;

async function speak(text) {
    try {
        const response = await fetch(`${API_BASE}/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });
        if (!response.ok) throw new Error("TTS failed");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        return new Promise(resolve => {
            audio.onended = resolve;
            audio.play();
        });
    } catch (e) {
        console.error("ElevenLabs failed, falling back to browser voice:", e);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        synth.speak(utterance);
        return new Promise(resolve => utterance.onend = resolve);
    }
}

function updateVoiceBubble(text, visible = true) {
    const bubble = document.getElementById('voice-bubble');
    const statusText = document.getElementById('voice-status-text');
    if (visible) {
        statusText.textContent = text;
        bubble.classList.add('visible');
    } else {
        bubble.classList.remove('visible');
    }
}

async function startVoiceConversation() {
    if (!SpeechRecognition) {
        alert("Speech recognition not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    const voiceBtn = document.getElementById('global-voice-btn');
    voiceBtn.classList.add('recording');

    updateVoiceBubble("EasyPay AI is waking up...");
    await speak("Hello Naitik! I am your EasyPay AI. How can I help you with your payments today?");
    updateVoiceBubble("Listening to you...");

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("User said:", transcript);
        
        if (voiceState === 'IDLE') {
            if (transcript.toLowerCase().includes('payment') || transcript.toLowerCase().includes('pay') || transcript.toLowerCase().includes('recharge')) {
                voiceState = 'WAITING_FOR_DETAILS';
                updateVoiceBubble("Asking for details...");
                await speak("Sure! Who would you like to pay, or how much would you like to recharge?");
                updateVoiceBubble("Listening for amount and vendor...");
                recognition.start();
            } else {
                updateVoiceBubble("Processing your query...");
                document.getElementById('ai-prompt').value = transcript;
                document.getElementById('ai-send-btn').click();
                await speak("I've processed that for you. Check your dashboard.");
                updateVoiceBubble("Ready");
                setTimeout(() => updateVoiceBubble(false), 2000);
            }
        } else if (voiceState === 'WAITING_FOR_DETAILS') {
            const amountMatch = transcript.match(/(\d+)/);
            const vendorMatch = transcript.match(/to ([a-zA-Z0-9 ]+)/);
            const amount = amountMatch ? amountMatch[0] : null;
            const vendor = vendorMatch ? vendorMatch[1] : null;

            if (amount) {
                if (vendor) {
                    updateVoiceBubble(`Processing ₹${amount} for ${vendor}...`);
                    await speak(`Okay, paying ${amount} rupees to ${vendor}. One moment please.`);
                    const success = await handleVendorPayment(vendor, amount);
                    if (success) {
                        await speak("Payment successful! Your balance has been updated.");
                    } else {
                        await speak("Sorry, payment failed. Please check your balance.");
                    }
                } else {
                    updateVoiceBubble(`Recharging wallet with ₹${amount}...`);
                    await speak(`Sure, initiating a recharge of ${amount} rupees.`);
                    document.getElementById('recharge-amount').value = amount;
                    handleRecharge();
                }
                voiceState = 'IDLE';
                updateVoiceBubble("Ready");
                setTimeout(() => updateVoiceBubble(false), 3000);
            } else {
                updateVoiceBubble("Amount not detected...");
                await speak("I didn't catch the amount. Please say it again.");
                recognition.start();
            }
        }
        voiceBtn.classList.remove('recording');
    };

    recognition.onend = () => {
        voiceBtn.classList.remove('recording');
    };

    recognition.start();
}

function appendMessage(windowId, sender, text, className) {
    const chatWindow = document.getElementById(windowId);
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ' + className;
    msgDiv.textContent = text;
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('logout-btn').addEventListener('click', () => {
    currentUser = null;
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('page-login').classList.add('active');
});
document.getElementById('ai-send-btn').addEventListener('click', () => sendAiQuery('ai-prompt', 'ai-insight-window', 'ai-send-btn'));
document.getElementById('ai-prompt').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendAiQuery('ai-prompt', 'ai-insight-window', 'ai-send-btn');
});
document.getElementById('full-ai-send-btn').addEventListener('click', () => sendAiQuery('full-ai-prompt', 'full-chat-window', 'full-ai-send-btn'));
document.getElementById('full-ai-prompt').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendAiQuery('full-ai-prompt', 'full-chat-window', 'full-ai-send-btn');
});
document.getElementById('pay-now-btn').addEventListener('click', handleRecharge);
document.getElementById('send-payment-btn').addEventListener('click', () => {
    const name = document.getElementById('vendor-name').value;
    const amt = document.getElementById('vendor-amount').value;
    handleVendorPayment(name, amt);
});

setInterval(loadDashboard, 5000);

loadDashboard();
