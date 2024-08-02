<script>
// Function to fetch total supply for a given contract address
async function fetchTotalSupply(contractAddress) {
try {
const response = await fetch(`${ETHERSCAN_API_URL}?module=stats&action=tokensupply&contractaddress=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`);
const data = await response.json();
if (data.status === "1") {
return parseFloat(data.result);
} else {
console.error('Error fetching total supply:', data.message);
return null;
}
} catch (error) {
console.error('Error fetching total supply:', error);
return null;
}
}

function formatPercentage(percentage) {
if (percentage >= 100) {
return '100%';
} else if (percentage < 0.01) {
return '<0.01%';
} else {
return `${percentage.toFixed(2)}%`;
}
}

function formatAddress(address) {
return `${address.slice(0, 6)}...${address.slice(-3)}`;
}

// Function to fetch and display top burnt coins
async function fetchTopBurntCoins() {
try {
const response = await fetch(`${ETHERSCAN_API_URL}?module=account&action=tokentx&address=${BURN_ADDRESS}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`);
const data = await response.json();
const burns = data.result || [];

const now = Math.floor(Date.now() / 1000);
const oneHourAgo = now - 60 * 60;
const sixHoursAgo = now - 6 * 60 * 60;

const lastHourBurns = burns.filter(burn => parseInt(burn.timeStamp) >= oneHourAgo);
const last6HoursBurns = burns.filter(burn => parseInt(burn.timeStamp) >= sixHoursAgo);

displayTopBurntAmount(lastHourBurns);
displayTopBurntFrequency(last6HoursBurns);
} catch (error) {
console.error('Error fetching top burnt coins:', error);
}
}

async function displayTopBurntAmount(burns) {
const burnsByAmount = {};
burns.forEach(burn => {
const amount = parseFloat(burn.value) / Math.pow(10, parseInt(burn.tokenDecimal));
if (burnsByAmount[burn.tokenSymbol]) {
burnsByAmount[burn.tokenSymbol].amount += amount;
} else {
burnsByAmount[burn.tokenSymbol] = {
amount: amount,
contractAddress: burn.contractAddress
};
}
});

const sortedBurns = Object.entries(burnsByAmount)
.sort(([, a], [, b]) => b.amount - a.amount)
.slice(0, 5);

const tableBody = document.getElementById('top-burnt-amount-body');
tableBody.innerHTML = '';

for (const [symbol, data] of sortedBurns) {
const row = tableBody.insertRow();
row.insertCell(0).textContent = `$${symbol}`;
row.insertCell(1).textContent = formatAmount(data.amount);

const totalSupply = await fetchTotalSupply(data.contractAddress);
let percentageBurnt = 'N/A';
if (totalSupply) {
const percentage = (data.amount / totalSupply) * 100;
percentageBurnt = formatPercentage(percentage);
}

row.insertCell(2).textContent = percentageBurnt;
const contractAddressCell = row.insertCell(3);
contractAddressCell.innerHTML = `<span class="copy-tooltip">
<span class="token-address" onclick="copyToClipboard('${data.contractAddress}')">${formatAddress(data.contractAddress)}</span>
<span class="tooltiptext">Copy</span>
</span>`;
}
}

function calculateBurnConsistency(burnTimestamps) {
if (burnTimestamps.length <= 1) return "N/A";

const intervals = [];
for (let i = 1; i < burnTimestamps.length; i++) {
intervals.push(burnTimestamps[i] - burnTimestamps[i-1]);
}

const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
const variance = intervals.reduce((a, b) => a + Math.pow(b - averageInterval, 2), 0) / intervals.length;
const standardDeviation = Math.sqrt(variance);

const coefficientOfVariation = standardDeviation / averageInterval;

if (coefficientOfVariation < 0.5) return "Very Consistent";
if (coefficientOfVariation < 1) return "Consistent";
if (coefficientOfVariation < 1.5) return "Somewhat Consistent";
return "Inconsistent";
}

function displayTopBurntFrequency(burns) {
const burnFrequency = {};
const burnTransactions = {};
const burnTimestamps = {};
burns.forEach(burn => {
if (burnFrequency[burn.tokenSymbol]) {
burnFrequency[burn.tokenSymbol]++;
burnTransactions[burn.tokenSymbol].add(burn.hash);
burnTimestamps[burn.tokenSymbol].push(parseInt(burn.timeStamp));
} else {
burnFrequency[burn.tokenSymbol] = 1;
burnTransactions[burn.tokenSymbol] = new Set([burn.hash]);
burnTimestamps[burn.tokenSymbol] = [parseInt(burn.timeStamp)];
}
});

const sortedFrequency = Object.entries(burnFrequency)
.sort(([, a], [, b]) => b - a)
.slice(0, 5);

const tableBody = document.getElementById('top-burnt-frequency-body');
tableBody.innerHTML = '';

sortedFrequency.forEach(([symbol, count]) => {
const row = tableBody.insertRow();
row.insertCell(0).textContent = `$${symbol}`;
row.insertCell(1).textContent = count;
row.insertCell(2).textContent = burnTransactions[symbol].size;
row.insertCell(3).textContent = calculateBurnConsistency(burnTimestamps[symbol].sort());
});
}

// Copy text to clipboard and show tooltip
function copyToClipboard(text) {
navigator.clipboard.writeText(text).then(() => {
const tooltip = event.target.nextElementSibling;
tooltip.innerHTML = "Copied!";
setTimeout(() => {
tooltip.innerHTML = "Copy";
}, 2000);
}).catch(err => {
console.error('Failed to copy: ', err);
});
}

// Call fetchTopBurntCoins initially and set up interval
fetchTopBurntCoins();
setInterval(fetchTopBurntCoins, 300000); // Refresh every 5 minutes

</script>