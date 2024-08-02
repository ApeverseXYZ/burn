<script>
const ETHERSCAN_API_KEY = '8RCGAW3Z6ERD4NKWY74WEIJ374IGKM2PZF';
const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const ETHERSCAN_API_URL = 'https://api.etherscan.io/api';

let burnsData = [];
let uniqueTokens = {};
let currentPage = 1;
const burnsPerPage = 10;
let filtersApplied = false;
let filteredBurnsData = [];
let burnTimestamps = [];

// Format the amount with suffixes
function formatAmount(amount) {
if (isNaN(amount)) return '0.00';
if (amount >= 1e9) {
return `${(amount / 1e9).toFixed(2)}bn`;
} else if (amount >= 1e6) {
return `${(amount / 1e6).toFixed(2)}m`;
} else if (amount >= 1e3) {
return `${(amount / 1e3).toFixed(2)}k`;
}
return amount.toFixed(2);
}

// Get the time ago string for a timestamp
function getTimeAgo(timestamp) {
const now = new Date().getTime();
const secondsPast = Math.floor((now - timestamp) / 1000);

if (secondsPast < 60) {
return `${secondsPast}s ago`;
}
if (secondsPast < 3600) {
return `${Math.floor(secondsPast / 60)}m ago`;
}
if (secondsPast <= 86400) {
return `${Math.floor(secondsPast / 3600)}h ago`;
}
if (secondsPast > 86400) {
const day = Math.floor(secondsPast / 86400);
return day === 1 ? `${day} day ago` : `${day} days ago`;
}
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

// Update the times displayed for each burn
function updateTimes() {
const now = new Date().getTime();
burnTimestamps.forEach((timestamp, index) => {
const secondsPast = Math.floor((now - timestamp) / 1000);
const timeElement = document.getElementById(`time-${index + 1}`);
if (timeElement) {
if (secondsPast < 60) {
timeElement.textContent = `Time: ${secondsPast}s ago`;
} else {
timeElement.textContent = `Time: ${getTimeAgo(timestamp)}`;
}
}
});
}

// Fetch recent burns
async function fetchRecentBurns() {
document.querySelector('.loading-icon').style.display = 'block';
try {
const response = await fetch(`${ETHERSCAN_API_URL}?module=account&action=tokentx&address=${BURN_ADDRESS}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`);
const data = await response.json();
burnsData = data.result || [];
uniqueTokens = {};
burnsData.forEach(token => {
uniqueTokens[token.contractAddress] = {
tokenName: token.tokenName,
tokenSymbol: token.tokenSymbol,
contractAddress: token.contractAddress
};
});
displayBurns(burnsData.slice(0, burnsPerPage), 1);
document.querySelector('.loading-icon').style.display = 'none';
togglePagination();
} catch (error) {
console.error('Error fetching burn data:', error);
document.getElementById('burnList').innerHTML = '<li>Error fetching burn data. Please try again later.</li>';
document.querySelector('.loading-icon').style.display = 'none';
}
}

// Display burns
function displayBurns(burns, startIndex) {
const burnList = document.getElementById('burnList');
burnList.innerHTML = '';
burnTimestamps = burns.map(burn => parseInt(burn.timeStamp) * 1000);

burns.forEach((tx, index) => {
const listItem = document.createElement('li');
listItem.className = 'burn-item';

const tokenAddress = tx.contractAddress;
const truncatedAddress = `${tokenAddress.slice(0, 4)}...${tokenAddress.slice(-3)}`;
const burnerAddress = `${tx.from.slice(0, 6)}...${tx.from.slice(-3)}`;
const amountBurnt = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
const timeAgo = getTimeAgo(tx.timeStamp * 1000);

listItem.innerHTML = `
<div class="burn-index">${startIndex + index}.</div>
<img src="https://raw.githubusercontent.com/ApeverseXYZ/Tracker/main/Ethereum.png" alt="${tx.tokenName} icon" class="token-icon">
<img src="https://raw.githubusercontent.com/ApeverseXYZ/burn/main/fire-icon-free-png.webp" alt="Flame icon" class="flame-icon">
<div class="burn-details">
<div class="token-name">${tx.tokenName}</div>
<div class="token-ticker">($${tx.tokenSymbol})</div>
<div class="amount">Amount: ${formatAmount(amountBurnt)}</div>
<div class="burner">Burner: <span class="copy-tooltip">
<span class="burner-address" onclick="copyToClipboard('${tx.from}')">${burnerAddress}</span>
<span class="tooltiptext">Copy</span>
</span></div>
<div class="ca">CA: <span class="copy-tooltip">
<span class="token-address" onclick="copyToClipboard('${tokenAddress}')">${truncatedAddress}</span>
<span class="tooltiptext">Copy</span>
</span></div>
<div class="time" id="time-${startIndex + index}">Time: ${timeAgo}</div>
<a href="https://etherscan.io/tx/${tx.hash}" target="_blank" class="etherscan-button" title="View on Etherscan"></a>
</div>
`;
burnList.appendChild(listItem);
});

document.getElementById('pagination').style.display = 'flex';
updateTimes();
setInterval(updateTimes, 1000);
}

// Toggle filter container visibility
function toggleFilterContainer() {
const filterContainer = document.getElementById('filterContainer');
filterContainer.style.display = filterContainer.style.display === 'none' || filterContainer.style.display === '' ? 'flex' : 'none';
}

// Hide suggestions when clicking outside
document.addEventListener('click', (event) => {
if (!event.target.closest('#filterBox') && !event.target.closest('#suggestions')) {
document.getElementById('suggestions').style.display = 'none';
}
});

// Filter suggestions
document.getElementById('filterBox').addEventListener('input', () => {
const searchTerm = document.getElementById('filterBox').value.trim().toLowerCase();
const suggestions = document.getElementById('suggestions');
suggestions.innerHTML = '';

if (!searchTerm) {
suggestions.style.display = 'none';
return;
}

const filteredTokens = Object.values(uniqueTokens).filter(token =>
token.tokenName.toLowerCase().startsWith(searchTerm) ||
token.tokenSymbol.toLowerCase().startsWith(searchTerm) ||
token.contractAddress.toLowerCase().startsWith(searchTerm)
);

filteredTokens.forEach(token => {
const div = document.createElement('div');
div.classList.add('suggestion');
const truncatedAddress = `${token.contractAddress.slice(0, 4)}...${token.contractAddress.slice(-3)}`;
div.innerHTML = `
<div class="burn-details">
<div class="token-name">${token.tokenName}</div>
<div class="token-ticker">($${token.tokenSymbol})</div>
<div class="ca">${truncatedAddress}</div>
</div>`;
div.addEventListener('click', () => {
document.getElementById('filterBox').value = token.contractAddress;
suggestions.innerHTML = '';
suggestions.style.display = 'none';
document.getElementById('timeFilters').style.display = 'flex';
});
suggestions.appendChild(div);
});

suggestions.style.display = 'block';
});

// Apply filters
function applyFilters() {
const filterTerm = document.getElementById('filterBox').value.trim().toLowerCase();
const fromYear = document.getElementById('fromYear').value;
const fromMonth = document.getElementById('fromMonth').value;
const fromDay = document.getElementById('fromDay').value;
const toYear = document.getElementById('toYear').value;
const toMonth = document.getElementById('toMonth').value;
const toDay = document.getElementById('toDay').value;

const fromDate = fromYear && fromMonth && fromDay ? new Date(`${fromYear}-${fromMonth}-${fromDay}`).getTime() / 1000 : null;
const toDate = toYear && toMonth && toDay ? new Date(`${toYear}-${toMonth}-${toDay}`).getTime() / 1000 : null;

filteredBurnsData = burnsData.filter(burn => {
const burnTime = parseInt(burn.timeStamp);
return (
(!filterTerm ||
burn.tokenName.toLowerCase().includes(filterTerm) ||
burn.tokenSymbol.toLowerCase().includes(filterTerm) ||
burn.contractAddress.toLowerCase().includes(filterTerm)) &&
(!fromDate || burnTime >= fromDate) &&
(!toDate || burnTime <= toDate)
);
});

if (filteredBurnsData.length === 0) {
displayNoBurnsFound();
} else {
displayBurns(filteredBurnsData.slice(0, burnsPerPage), 1);
}

currentPage = 1;
togglePagination(filteredBurnsData.length);
filtersApplied = true;
}

// Clear filters
document.getElementById('clearFiltersButton').addEventListener('click', () => {
document.getElementById('filterBox').value = '';
document.getElementById('fromYear').value = '';
document.getElementById('fromMonth').value = '';
document.getElementById('fromDay').value = '';
document.getElementById('toYear').value = '';
document.getElementById('toMonth').value = '';
document.getElementById('toDay').value = '';
document.getElementById('timeFilters').style.display = 'none';
document.getElementById('filterContainer').style.display = 'none';
filtersApplied = false;
displayBurns(burnsData.slice(0, burnsPerPage), 1);
currentPage = 1;
togglePagination(burnsData.length);
});

// Display no burns found message
function displayNoBurnsFound() {
const burnList = document.getElementById('burnList');
burnList.innerHTML = '';

const listItem = document.createElement('li');
listItem.className = 'no-burns-item';
listItem.textContent = 'No burns found in the selected time interval.';
burnList.appendChild(listItem);

document.getElementById('pagination').style.display = 'none';
}

// Pagination functions
function togglePagination(totalItems = filtersApplied ? filteredBurnsData.length : burnsData.length) {
const totalPages = Math.ceil(totalItems / burnsPerPage);
document.getElementById('pageInfo').innerText = `${currentPage}/${totalPages}`;
document.getElementById('prevPage').disabled = currentPage === 1;
document.getElementById('nextPage').disabled = currentPage === totalPages;
}

document.getElementById('prevPage').addEventListener('click', () => {
if (currentPage > 1) {
currentPage--;
const startIndex = (currentPage - 1) * burnsPerPage;
const dataToDisplay = filtersApplied ? filteredBurnsData : burnsData;
displayBurns(dataToDisplay.slice(startIndex, startIndex + burnsPerPage), startIndex + 1);
togglePagination();
}
});

document.getElementById('nextPage').addEventListener('click', () => {
const totalPages = Math.ceil((filtersApplied ? filteredBurnsData.length : burnsData.length) / burnsPerPage);
if (currentPage < totalPages) {
currentPage++;
const startIndex = (currentPage - 1) * burnsPerPage;
const dataToDisplay = filtersApplied ? filteredBurnsData : burnsData;
displayBurns(dataToDisplay.slice(startIndex, startIndex + burnsPerPage), startIndex + 1);
togglePagination();
}
});

// Populate year, month, and day selectors
function populateDateSelectors() {
const currentYear = new Date().getFullYear();
const fromYearSelect = document.getElementById('fromYear');
const toYearSelect = document.getElementById('toYear');
const fromMonthSelect = document.getElementById('fromMonth');
const toMonthSelect = document.getElementById('toMonth');
const fromDaySelect = document.getElementById('fromDay');
const toDaySelect = document.getElementById('toDay');

for (let year = currentYear; year >= 2000; year--) {
const optionFrom = document.createElement('option');
const optionTo = document.createElement('option');
optionFrom.value = optionTo.value = year;
optionFrom.textContent = optionTo.textContent = year;
fromYearSelect.appendChild(optionFrom);
toYearSelect.appendChild(optionTo);
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
for (let month = 0; month < 12; month++) {
const optionFrom = document.createElement('option');
const optionTo = document.createElement('option');
optionFrom.value = optionTo.value = (month + 1).toString().padStart(2, '0');
optionFrom.textContent = optionTo.textContent = monthNames[month];
fromMonthSelect.appendChild(optionFrom);
toMonthSelect.appendChild(optionTo);
}

for (let day = 1; day <= 31; day++) {
const optionFrom = document.createElement('option');
const optionTo = document.createElement('option');
optionFrom.value = optionTo.value = day.toString().padStart(2, '0');
optionFrom.textContent = optionTo.textContent = day.toString().padStart(2, '0');
fromDaySelect.appendChild(optionFrom);
toDaySelect.appendChild(optionTo);
}
}

// Add event listeners
document.getElementById('applyFilterButton').addEventListener('click', applyFilters);

// Initialize
window.onload = () => {
fetchRecentBurns();
setInterval(fetchRecentBurns, 60000); // Refresh every minute
populateDateSelectors();
};
</script>