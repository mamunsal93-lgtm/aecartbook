const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize base structure if db.json doesn't exist
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
        products: [],
        customers: [],
        invoices: [],
        returns: [],
        staff: []
    }, null, 2));
}

// 1. GET /sync (For Mobile App to download DB)
app.get('/sync', (req, res) => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. POST /sync (For Mobile App Background Auto-Sync & Manual Upload)
app.post('/sync', (req, res) => {
    try {
        const payload = req.body;
        if (!payload || typeof payload !== 'object') {
            return res.status(400).json({ error: "Invalid data format" });
        }
        
        fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf8');
        console.log(`[${new Date().toLocaleTimeString()}] Live Synced successfully! Data size: ${JSON.stringify(payload).length} bytes`);
        res.status(200).json({ success: true, message: "Server synced successfully!" });
    } catch (e) {
        console.error("Sync writing failed:", e);
        res.status(500).json({ error: e.message });
    }
});

// 3. GET / (Dynamic Web UI - Admin Dashboard for computer)
app.get('/', (req, res) => {
    const rawHtml = `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>আলম এন্টারপ্রাইজ - অ্যাডমিন কন্ট্রোল প্যানেল</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
            body { font-family: 'Hind Siliguri', sans-serif; }
        </style>
    </head>
    <body class="bg-slate-900 text-slate-100 min-h-screen">
        <div class="flex flex-col min-h-screen">
            <!-- Header -->
            <header class="bg-slate-800 border-b border-slate-700 py-4 px-6 sticky top-0 z-50">
                <div class="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div class="flex items-center gap-3">
                        <div class="bg-indigo-600 p-2.5 rounded-lg text-white shadow-lg">
                            <i class="fa-solid fa-chart-line text-xl"></i>
                        </div>
                        <div>
                            <h1 class="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                আলম এন্টারপ্রাইজ <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">অটো-লাইভ সিঙ্ক</span>
                            </h1>
                            <p class="text-xs text-slate-400">SR অর্ডার ট্র্যাকিং ও অ্যাডমিন ড্যাশবোর্ড</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-4 text-xs md:text-sm">
                        <div class="bg-slate-900/60 border border-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-slate-300">
                            <i class="fa-solid fa-clock text-amber-400 animate-pulse"></i>
                            <span>শেষ আপডেট: </span>
                            <span id="last-updated" class="font-bold text-white">লোডিং...</span>
                        </div>
                        <button onclick="fetchData()" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors font-medium">
                            <i class="fa-solid fa-arrows-rotate"></i> রিফ্রেশ
                        </button>
                    </div>
                </div>
            </header>

            <main class="flex-grow container mx-auto px-4 py-6 md:py-8">
                <!-- KPI cards -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <!-- Cards -->
                    <div class="bg-slate-800/80 p-5 rounded-xl border border-slate-700/60 shadow-lg">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-slate-400 font-medium">মোট চলতি সেলস</span>
                            <div class="bg-indigo-500/10 text-indigo-400 p-2 rounded-lg"><i class="fa-solid fa-bangladeshi-taka-sign"></i></div>
                        </div>
                        <h2 id="kpi-sales" class="text-2xl font-bold text-white">৳0.00</h2>
                        <p id="kpi-orders-count" class="text-xs text-slate-400 mt-2">মোট ০ টি মেমো</p>
                    </div>

                    <div class="bg-slate-800/80 p-5 rounded-xl border border-slate-700/60 shadow-lg">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-slate-400 font-medium">মোট ক্যাশ কালেকশন</span>
                            <div class="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg"><i class="fa-solid fa-wallet"></i></div>
                        </div>
                        <h2 id="kpi-received" class="text-2xl font-bold text-emerald-400">৳0.00</h2>
                        <p id="kpi-received-detail" class="text-xs text-slate-400 mt-2">নগদ + বকেয়া উসুল জমা</p>
                    </div>

                    <div class="bg-slate-800/80 p-5 rounded-xl border border-slate-700/60 shadow-lg">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-slate-400 font-medium">মোট বকেয়া বিল</span>
                            <div class="bg-rose-500/10 text-rose-400 p-2 rounded-lg"><i class="fa-solid fa-file-invoice"></i></div>
                        </div>
                        <h2 id="kpi-dues" class="text-2xl font-bold text-rose-400">৳0.00</h2>
                        <p class="text-xs text-slate-400 mt-2">মার্কেটে বকেয়া পড়ে আছে</p>
                    </div>

                    <div class="bg-slate-800/80 p-5 rounded-xl border border-slate-700/60 shadow-lg">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-slate-400 font-medium">স্টক শেষ পণ্য</span>
                            <div class="bg-amber-500/10 text-amber-400 p-2 rounded-lg"><i class="fa-solid fa-triangle-exclamation"></i></div>
                        </div>
                        <h2 id="kpi-lowstock" class="text-2xl font-bold text-amber-400">0</h2>
                        <p class="text-xs text-slate-400 mt-2">লিস্টে রি-অর্ডার পণ্য সংখ্যা</p>
                    </div>
                </div>

                <!-- Tabs navigation -->
                <div class="flex gap-2 border-b border-slate-750 mb-6 bg-slate-800/30 p-1.5 rounded-lg w-fit">
                    <button onclick="switchTab('invoices-tab', this)" class="tab-btn px-5 py-2.5 rounded-md font-semibold text-sm transition-colors text-white bg-indigo-600">
                        <i class="fa-solid fa-file-invoice-dollar mr-1"></i> লাইভ মেমো সমূহ (<span id="count-invoices">0</span>)
                    </button>
                    <button onclick="switchTab('products-tab', this)" class="tab-btn px-5 py-2.5 rounded-md font-semibold text-sm transition-colors text-slate-400 hover:text-white">
                        <i class="fa-solid fa-boxes-stacked mr-1"></i> ইনভেন্টরি স্টক (<span id="count-products">0</span>)
                    </button>
                    <button onclick="switchTab('customers-tab', this)" class="tab-btn px-5 py-2.5 rounded-md font-semibold text-sm transition-colors text-slate-400 hover:text-white">
                        <i class="fa-solid fa-users mr-1"></i> গ্রাহক ও বকেয়া তালিকা (<span id="count-customers">0</span>)
                    </button>
                </div>

                <!-- Content Sections -->
                <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 md:p-6 shadow-xl relative min-h-[400px]">
                    <!-- 1. INVOICES -->
                    <div id="invoices-tab" class="tab-content">
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <h3 class="text-lg font-bold text-white flex items-center gap-2">
                                <i class="fa-solid fa-list text-indigo-500"></i> মেমোর বিস্তারিত ড্যাশবোর্ড
                            </h3>
                            <input oninput="searchInvoices(this.value)" type="text" placeholder="মেমো নম্বর বা কাস্টমার এর নাম দিয়ে খুঁজুন..." class="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 w-full md:w-80 focus:outline-none focus:border-indigo-600">
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm text-left text-slate-300">
                                <thead class="text-xs uppercase bg-slate-700/40 text-slate-400">
                                    <tr>
                                        <th class="py-3.5 px-4 rounded-l-lg">মেমো নং</th>
                                        <th class="py-3.5 px-4">তারিখ</th>
                                        <th class="py-3.5 px-4">কাস্টমারের নাম ও মোবাইল</th>
                                        <th class="py-3.5 px-4">মোট বিল</th>
                                        <th class="py-3.5 px-4">ডিসকাউন্ট</th>
                                        <th class="py-3.5 px-4">নগদ প্রদান</th>
                                        <th class="py-3.5 px-4">বকেয়া রেকর্ড</th>
                                        <th class="py-3.5 px-4">টোটাল বকেয়া স্থিতি</th>
                                        <th class="py-3.5 px-4 rounded-r-lg text-center">অ্যাকশন</th>
                                    </tr>
                                </thead>
                                <tbody id="invoices-table" class="divide-y divide-slate-700/50">
                                    <tr>
                                        <td colspan="9" class="text-center py-8 text-slate-500">কোনো মেমো পাওয়া যায়নি।</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 2. PRODUCTS -->
                    <div id="products-tab" class="tab-content hidden">
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <h3 class="text-lg font-bold text-white flex items-center gap-2">
                                <i class="fa-solid fa-box text-indigo-500"></i> প্রোডাক্ট ও একটিভ স্টক লিস্ট
                            </h3>
                            <input oninput="searchProducts(this.value)" type="text" placeholder="পণ্যের নাম দিয়ে খুঁজুন..." class="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 w-full md:w-80 focus:outline-none focus:border-indigo-600">
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm text-left text-slate-300">
                                <thead class="text-xs uppercase bg-slate-700/40 text-slate-400">
                                    <tr>
                                        <th class="py-3.5 px-4 rounded-l-lg">আইডি</th>
                                        <th class="py-3.5 px-4">পণ্যের নাম</th>
                                        <th class="py-3.5 px-4">ক্রয়মূল্য</th>
                                        <th class="py-3.5 px-4">বিক্রয়মূল্য</th>
                                        <th class="py-3.5 px-4">স্টক সংখ্যা (Qty)</th>
                                        <th class="py-3.5 px-4 rounded-r-lg">স্টক অ্যালার্ট লেভেল</th>
                                    </tr>
                                </thead>
                                <tbody id="products-table" class="divide-y divide-slate-700/50">
                                    <tr>
                                        <td colspan="6" class="text-center py-8 text-slate-500">কোনো প্রোডাক্ট পাওয়া যায়নি।</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 3. CUSTOMERS -->
                    <div id="customers-tab" class="tab-content hidden">
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <h3 class="text-lg font-bold text-white flex items-center gap-2">
                                <i class="fa-solid fa-people-carry-box text-indigo-500"></i> ডিলার, কাস্টমার ও পূর্বের ডিউস
                            </h3>
                            <input oninput="searchCustomers(this.value)" type="text" placeholder="কাস্টমারের নাম বা মোবাইল দিয়ে খুঁজুন..." class="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 w-full md:w-80 focus:outline-none focus:border-indigo-600">
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm text-left text-slate-300">
                                <thead class="text-xs uppercase bg-slate-700/40 text-slate-400">
                                    <tr>
                                        <th class="py-3.5 px-4 rounded-l-lg">কাস্টমার আইডি</th>
                                        <th class="py-3.5 px-4">নাম</th>
                                        <th class="py-3.5 px-4">মোবাইল ফোন</th>
                                        <th class="py-3.5 px-4">ঠিকানা</th>
                                        <th class="py-3.5 px-4 rounded-r-lg text-right">মোট বকেয়া বকেয়া (৳)</th>
                                    </tr>
                                </thead>
                                <tbody id="customers-table" class="divide-y divide-slate-700/50">
                                    <tr>
                                        <td colspan="5" class="text-center py-8 text-slate-500">কোনো গ্রাহক পাওয়া যায়নি।</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            <!-- Footer -->
            <footer class="bg-slate-800 border-t border-slate-700 py-4 text-center text-slate-400 text-xs">
                &copy; ${new Date().getFullYear()} আলম এন্টারপ্রাইজ - সর্বস্বত্ব সংরক্ষিত। লাইভ সিঙ্ক ড্যাশবোর্ড সিস্টেম।
            </footer>
        </div>

        <!-- Detail Modal Dialog -->
        <div id="invoice-modal" class="fixed inset-0 bg-slate-950/80 hidden z-50 flex items-center justify-center p-4">
            <div class="bg-slate-800 border border-slate-700 w-full max-w-lg rounded-2xl p-6 relative shadow-2xl">
                <button onclick="closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors text-xl">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-ticket text-indigo-500"></i> ইনভয়েস মেমোর রসিদ
                </h3>
                <div id="invoice-details-content" class="bg-white text-black p-4 rounded-xl font-mono text-[11px] whitespace-pre-wrap max-h-[450px] overflow-y-auto leading-relaxed border border-slate-300">
                    <!-- Dynamic -->
                </div>
                <div class="flex justify-end gap-3 mt-5">
                    <button onclick="closeModal()" class="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm font-semibold transition-colors">
                        বন্ধ করুন
                    </button>
                </div>
            </div>
        </div>

        <script>
            let localData = { products: [], customers: [], invoices: [], returns: [], staff: [] };

            function formatPrice(p) {
                return parseFloat(p).toLocaleString('bn-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }

            async function fetchData() {
                try {
                    const res = await fetch('/sync');
                    if (res.ok) {
                        localData = await res.json();
                        updateDashboard();
                        document.getElementById('last-updated').innerText = new Date().toLocaleTimeString('bn-BD');
                    }
                } catch (e) {
                    console.error("Error reading db data:", e);
                }
            }

            function updateDashboard() {
                // Counts
                document.getElementById('count-invoices').innerText = (localData.invoices || []).length;
                document.getElementById('count-products').innerText = (localData.products || []).length;
                document.getElementById('count-customers').innerText = (localData.customers || []).length;

                // KPIs
                let totalSales = 0;
                let totalPaid = 0;
                let totalDuePayments = 0;
                let totalDuesRemaining = 0;

                (localData.invoices || []).forEach(inv => {
                    totalSales += (inv.totalAmount || 0);
                    totalPaid += (inv.paidAmount || 0);
                    totalDuePayments += (inv.duePaymentAmount || 0);
                });

                (localData.customers || []).forEach(cust => {
                    totalDuesRemaining += (cust.previousDues || 0);
                });

                document.getElementById('kpi-sales').innerText = "৳" + formatPrice(totalSales);
                document.getElementById('kpi-orders-count').innerText = "মোট " + (localData.invoices || []).length + " টি মেমো";
                
                // Total received = cash collections from orders + any due collectors
                document.getElementById('kpi-received').innerText = "৳" + formatPrice(totalPaid + totalDuePayments);
                document.getElementById('kpi-received-detail').innerText = "নগদ: ৳" + formatPrice(totalPaid) + " | বকেয়া জমা: ৳" + formatPrice(totalDuePayments);
                document.getElementById('kpi-dues').innerText = "৳" + formatPrice(totalDuesRemaining);

                // Low Stock
                let alertCount = 0;
                (localData.products || []).forEach(prod => {
                    if (prod.quantity <= (prod.lowStockCount || 5)) alertCount++;
                });
                document.getElementById('kpi-lowstock').innerText = alertCount;
                if (alertCount > 0) {
                    document.getElementById('kpi-lowstock').className = "text-2xl font-bold text-rose-400";
                } else {
                    document.getElementById('kpi-lowstock').className = "text-2xl font-bold text-slate-400";
                }

                // Render Current Active View
                renderInvoices(localData.invoices || []);
                renderProducts(localData.products || []);
                renderCustomers(localData.customers || []);
            }

            function renderInvoices(items) {
                const tbody = document.getElementById('invoices-table');
                if (items.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-8 text-slate-500">কোনো মেমো পাওয়া যায়নি।</td></tr>';
                    return;
                }
                
                tbody.innerHTML = items.map(inv => {
                    // remaining dues formula consistent with app
                    const duesRem = (inv.previousDues + inv.totalAmount) - inv.discount - inv.paidAmount - inv.duePaymentAmount;
                    return \`
                        <tr class="hover:bg-slate-750/50 transition-colors">
                            <td class="py-3.5 px-4 font-mono font-bold text-indigo-400">#\${inv.id}</td>
                            <td class="py-3.5 px-4 text-slate-400">\${inv.dateStr}</td>
                            <td class="py-3.5 px-4">
                                <div class="font-semibold text-white">\${inv.customerName}</div>
                                <div class="text-xs text-slate-400">\${inv.customerPhone}</div>
                            </td>
                            <td class="py-3.5 px-4 font-bold text-slate-100">৳\${formatPrice(inv.totalAmount)}</td>
                            <td class="py-3.5 px-4 text-slate-400">৳\${formatPrice(inv.discount)}</td>
                            <td class="py-3.5 px-4 text-emerald-400 font-semibold">৳\${formatPrice(inv.paidAmount)}</td>
                            <td class="py-3.5 px-4 text-indigo-400 font-semibold">৳\${formatPrice(inv.duePaymentAmount)}</td>
                            <td class="py-3.5 px-4 font-bold \${duesRem > 0 ? 'text-rose-400' : 'text-slate-400'}">৳\${formatPrice(Math.max(0, duesRem))}</td>
                            <td class="py-3.5 px-4 text-center">
                                <button onclick="showDetails(\${inv.id})" class="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs transition-colors font-medium">
                                    <i class="fa-solid fa-eye-dropper"></i> মেমো রসিদ
                                </button>
                            </td>
                        </tr>
                    \`;
                }).join('');
            }

            function renderProducts(items) {
                const tbody = document.getElementById('products-table');
                if (items.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-500">কোনো প্রোডাক্ট পাওয়া যায়নি।</td></tr>';
                    return;
                }
                tbody.innerHTML = items.map(prod => {
                    const isLow = prod.quantity <= (prod.lowStockCount || 5);
                    return \`
                        <tr class="hover:bg-slate-750/50 transition-colors \${isLow ? 'bg-rose-500/5' : ''}">
                            <td class="py-3.5 px-4 font-mono text-slate-400">#\${prod.id}</td>
                            <td class="py-3.5 px-4 font-semibold text-white">\${prod.name}</td>
                            <td class="py-3.5 px-4">৳\${formatPrice(prod.purchasePrice)}</td>
                            <td class="py-3.5 px-4 text-emerald-400 font-bold">৳\${formatPrice(prod.sellingPrice)}</td>
                            <td class="py-3.5 px-4 font-bold \${isLow ? 'text-rose-400 animate-pulse' : 'text-white'}">
                                \${prod.quantity} পিস
                            </td>
                            <td class="py-3.5 px-4 text-slate-400">\${prod.lowStockCount || 5} পিস এর কম হলে</td>
                        </tr>
                    \`;
                }).join('');
            }

            function renderCustomers(items) {
                const tbody = document.getElementById('customers-table');
                if (items.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-500">কোনো গ্রাহক পাওয়া যায়নি।</td></tr>';
                    return;
                }
                tbody.innerHTML = items.map(cust => {
                    return \`
                        <tr class="hover:bg-slate-750/50 transition-colors">
                            <td class="py-3.5 px-4 font-mono text-slate-400">#\${cust.id}</td>
                            <td class="py-3.5 px-4 font-semibold text-white">\${cust.name}</td>
                            <td class="py-3.5 px-4 text-slate-300">\${cust.phone}</td>
                            <td class="py-3.5 px-4 text-slate-400">\${cust.address}</td>
                            <td class="py-3.5 px-4 text-right font-bold \${cust.previousDues > 0 ? 'text-rose-400' : 'text-slate-400'}">৳\${formatPrice(cust.previousDues)}</td>
                        </tr>
                    \`;
                }).join('');
            }

            function switchTab(tabId, btn) {
                document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
                document.getElementById(tabId).classList.remove('hidden');

                document.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('bg-indigo-600', 'text-white');
                    b.classList.add('text-slate-400', 'hover:text-white');
                });
                btn.classList.add('bg-indigo-600', 'text-white');
                btn.classList.remove('text-slate-400', 'hover:text-white');
            }

            function searchInvoices(val) {
                const term = val.toLowerCase();
                const filtered = localData.invoices.filter(i => 
                    i.customerName.toLowerCase().includes(term) || 
                    i.id.toString().includes(term)
                );
                renderInvoices(filtered);
            }

            function searchProducts(val) {
                const term = val.toLowerCase();
                const filtered = localData.products.filter(p => p.name.toLowerCase().includes(term));
                renderProducts(filtered);
            }

            function searchCustomers(val) {
                const term = val.toLowerCase();
                const filtered = localData.customers.filter(c => 
                    c.name.toLowerCase().includes(term) || 
                    c.phone.includes(term)
                );
                renderCustomers(filtered);
            }

            function showDetails(invoiceId) {
                const inv = localData.invoices.find(i => i.id === invoiceId);
                if (!inv) return;

                const duesRem = (inv.previousDues + inv.totalAmount) - inv.discount - inv.paidAmount - inv.duePaymentAmount;

                let itemsList = "";
                try {
                    const arr = JSON.parse(inv.itemsJson);
                    arr.forEach(it => {
                        let total = it.quantity * it.sellingPrice;
                        itemsList += \`\${it.productName.padEnd(20)} \${it.quantity.toString().padStart(4)} \${parseFloat(it.sellingPrice).toFixed(2).padStart(8)} ৳\${total.toFixed(2).padStart(8)}\\n\`;
                    });
                } catch(e) {
                    itemsList = inv.itemsJson;
                }

                const payload = \`
                       আলম এন্টারপ্রাইজ
            চরমুগরিয়া বাজার মেইন রোড, মাদারীপুর।
                    মোবাইল: 01746664154
----------------------------------------------
মেমো নম্বর: #\${inv.id}
তারিখ      : \${inv.dateStr}
গ্রাহক নাম : \${inv.customerName}
মোবাইল    : \${inv.customerPhone}
ঠিকানা     : \${inv.customerAddress}
----------------------------------------------
পণ্যের নাম          পরিমাণ     দর       মোট
----------------------------------------------
\${itemsList}----------------------------------------------
চলতি বিল মোট          : ৳\${parseFloat(inv.totalAmount).toFixed(2)}
ডিসকাউন্ট             : ৳\${parseFloat(inv.discount).toFixed(2)}
পূর্বের মোট বকেয়া       : ৳\${parseFloat(inv.previousDues).toFixed(2)}
নগদ পরিশোধ           : ৳\${parseFloat(inv.paidAmount).toFixed(2)}
বকেয়া পরিশোধ জমা      : ৳\${parseFloat(inv.duePaymentAmount).toFixed(2)}
----------------------------------------------
সর্বমোট বকেয়া বিল       : ৳\${Math.max(0, duesRem).toFixed(2)}
----------------------------------------------
*আমাদের সাথে ব্যবসা করার জন্য ধন্যবাদ।
*SR ও DSR এর সাথে ব্যক্তিগত লেনদেন করবেন না।
\`;
                document.getElementById('invoice-details-content').innerText = payload;
                document.getElementById('invoice-modal').classList.remove('hidden');
            }

            function closeModal() {
                document.getElementById('invoice-modal').classList.add('hidden');
            }

            // Initial load
            fetchData();
            
            // Auto Update background pooling for Realtime tracking!
            setInterval(fetchData, 5000);
        </script>
    </body>
    </html>
    `;
    res.send(rawHtml);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`[Alam Enterprise Server Launched Successfully]`);
    console.log(`👉 Access Admin Panel at: http://localhost:${PORT}`);
    console.log(`👉 Inside Local Wifi API URL: http://YOUR_PC_IP_ADDRESS:${PORT}/sync`);
    console.log(`=======================================================`);
});