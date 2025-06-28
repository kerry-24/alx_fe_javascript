let quotes = [
    { text: "The only way to do great work is to love what you do.", category: "motivation" },
    { text: "Life is what happens to you while you're busy making other plans.", category: "life" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", category: "dreams" },
    { text: "It is during our darkest moments that we must focus to see the light.", category: "inspiration" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", category: "success" },
    { text: "The only impossible journey is the one you never begin.", category: "motivation" },
    { text: "In the end, we will remember not the words of our enemies, but the silence of our friends.", category: "friendship" },
    { text: "Be yourself; everyone else is already taken.", category: "life" }
];

//Implement filtering logic
let filteredQuotes = [...quotes];
let currentCategory = 'all';

//server simulation variables
const SERVER_BASE_URL = "https://jsonplaceholder.typicode.com/posts";
let syncInterval;
let lastSyncTime = 0;


// implement local storage
function saveQuotes () {
  localStorage.setItem('quotes', JSON.stringify(quotes));
}

function loadQuotes () {
  const savedQuotes = localStorage.getItem('quotes');
  if (savedQuotes) {
    quotes = JSON.parse(savedQuotes)
  }
}
//implement session storage
function saveLastViewedQuote(quote) {
    sessionStorage.setItem('lastViewedQuote', JSON.stringify(quote));
}

function getLastViewedQuote() {
    const lastQuote = sessionStorage.getItem('lastViewedQuote');
    return lastQuote ? JSON.parse(lastQuote) : null;
}

//filtering functions 
function populateCategories() {
    const categoryFilter = document.getElementById('categoryFilter');
    
    // Get unique categories from quotes
    const categories = [...new Set(quotes.map(quote => quote.category))];
    
    // Clear existing options except "All Categories"
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    
    // Add category options
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categoryFilter.appendChild(option);
    });
    
    // Restore last selected category
    const savedCategory = localStorage.getItem('selectedCategory');
    if (savedCategory) {
        categoryFilter.value = savedCategory;
        currentCategory = savedCategory;
    }
}

function filterQuotes() {
    const categoryFilter = document.getElementById('categoryFilter');
    const selectedCategory = categoryFilter.value;
    currentCategory = selectedCategory;
    
    // Save selected category to localStorage
    localStorage.setItem('selectedCategory', selectedCategory);
    
    // Filter quotes based on selected category
    if (selectedCategory === 'all') {
        filteredQuotes = [...quotes];
    } else {
        filteredQuotes = quotes.filter(quote => quote.category === selectedCategory);
    }
    
    // Show a random quote from filtered results
    showRandomQuoteFromFiltered();
}

// Server simulation functions
async function fetchQuotesFromServer() {
    try {
        // Simulate fetching posts and converting them to quotes
        const response = await fetch(`${SERVER_BASE_URL}/posts?_limit=5`);
        const posts = await response.json();
        
        // Convert posts to quote format
        const serverQuotes = posts.map(post => ({
            id: post.id,
            text: post.title,
            category: 'server',
            timestamp: Date.now()
        }));
        
        return serverQuotes;
    } catch (error) {
        console.error('Error fetching from server:', error);
        return [];
    }
}

async function postQuoteToServer(quote) {
    try {
        const response = await fetch(`${SERVER_BASE_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: quote.text,
                body: quote.category,
                userId: 1
            })
        });
        
        const result = await response.json();
        console.log('Quote posted to server:', result);
        return true;
    } catch (error) {
        console.error('Error posting to server:', error);
        return false;
    }
}

function startPeriodicSync() {
    // Sync every 30 seconds
    syncInterval = setInterval(() => {
        syncWithServer();
    }, 30000);
}

function stopPeriodicSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
    }
}
// Server syncing functions 
async function syncWithServer() {
    showSyncStatus('Syncing with server...', 'info');
    
    try {
        const serverQuotes = await fetchQuotesFromServer();
        
        if (serverQuotes.length === 0) {
            showSyncStatus('No server data available', 'warning', 3000);
            return;
        }
        
        const conflicts = await resolveConflicts(serverQuotes);
        
        if (conflicts.length > 0) {
            showSyncStatus(`Sync completed. ${conflicts.length} conflicts resolved.`, 'success', 5000);
            showConflictNotification(conflicts);
        } else {
            showSyncStatus('Sync completed successfully.', 'success', 3000);
        }
        
        // Update UI
        populateCategories();
        filterQuotes();
        
    } catch (error) {
        showSyncStatus('Sync failed. Please try again.', 'error', 5000);
        console.error('Sync error:', error);
    }
}

async function resolveConflicts(serverQuotes) {
    const conflicts = [];
    const localQuoteTexts = new Set(quotes.map(q => q.text.toLowerCase()));
    
    serverQuotes.forEach(serverQuote => {
        // Check if quote already exists locally
        if (!localQuoteTexts.has(serverQuote.text.toLowerCase())) {
            // Add new quote from server
            quotes.push({
                text: serverQuote.text,
                category: serverQuote.category,
                source: 'server',
                syncTime: Date.now()
            });
            conflicts.push({
                type: 'added',
                quote: serverQuote
            });
        }
    });
    
    // Save updated quotes
    saveQuotes();
    filteredQuotes = [...quotes];
    
    return conflicts;
}

function showSyncStatus(message, type, duration = 0) {
    const syncStatus = document.getElementById('syncStatus');
    const syncMessage = document.getElementById('syncMessage');
    
    syncStatus.style.display = 'block';
    syncMessage.textContent = message;
    
    // Style based on type
    switch(type) {
        case 'info':
            syncStatus.style.backgroundColor = '#d1ecf1';
            syncStatus.style.color = '#0c5460';
            break;
        case 'success':
            syncStatus.style.backgroundColor = '#d4edda';
            syncStatus.style.color = '#155724';
            break;
        case 'warning':
            syncStatus.style.backgroundColor = '#fff3cd';
            syncStatus.style.color = '#856404';
            break;
        case 'error':
            syncStatus.style.backgroundColor = '#f8d7da';
            syncStatus.style.color = '#721c24';
            break;
    }
    
    if (duration > 0) {
        setTimeout(() => {
            syncStatus.style.display = 'none';
        }, duration);
    }
}

// Conflict handling functions 
function showConflictNotification(conflicts) {
    const notification = document.getElementById('conflictNotification');
    const details = document.getElementById('conflictDetails');
    
    let conflictHtml = '<ul>';
    conflicts.forEach(conflict => {
        if (conflict.type === 'added') {
            conflictHtml += `<li>Added new quote: "${conflict.quote.text.substring(0, 50)}..."</li>`;
        }
    });
    conflictHtml += '</ul>';
    
    details.innerHTML = conflictHtml;
    notification.style.display = 'block';
}

function hideConflictNotification() {
    document.getElementById('conflictNotification').style.display = 'none';
}

function viewAllQuotes() {
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.value = 'all';
    filterQuotes();
    hideConflictNotification();
}

// Enhanced addQuote function to sync with server
async function addQuoteWithSync(text, category) {
    const newQuote = { text, category, source: 'local', timestamp: Date.now() };
    
    // Add locally first
    quotes.push(newQuote);
    saveQuotes();
    
    // Try to sync with server
    const synced = await postQuoteToServer(newQuote);
    if (synced) {
        showSyncStatus('Quote added and synced to server', 'success', 3000);
    } else {
        showSyncStatus('Quote added locally (server sync failed)', 'warning', 3000);
    }
    
    populateCategories();
    filterQuotes();
}
function showRandomQuoteFromFiltered() {
    // Check if filtered quotes array is not empty
    if (filteredQuotes.length === 0) {
        quoteDisplay.innerHTML = '<p>No quotes available in this category.</p>';
        return;
    }
    
    // Get a random quote from the filtered array
    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    const selectedQuote = filteredQuotes[randomIndex];
    
    // Save to session storage
    saveLastViewedQuote(selectedQuote);
    
    // Create and manipulate DOM elements to display the quote
    quoteDisplay.innerHTML = '';
    
    // Create quote text element
    const quoteText = document.createElement('blockquote');
    quoteText.textContent = selectedQuote.text;
    quoteText.style.fontSize = '18px';
    quoteText.style.fontStyle = 'italic';
    quoteText.style.margin = '20px 0';
    quoteText.style.padding = '15px';
    quoteText.style.borderLeft = '4px solid #007bff';
    quoteText.style.backgroundColor = '#f8f9fa';
    
    // Create category element
    const categoryElement = document.createElement('p');
    categoryElement.textContent = `Category: ${selectedQuote.category}`;
    categoryElement.style.color = '#6c757d';
    categoryElement.style.fontSize = '14px';
    categoryElement.style.textTransform = 'uppercase';
    categoryElement.style.letterSpacing = '1px';
    
    // Append elements to the quote display container
    quoteDisplay.appendChild(quoteText);
    quoteDisplay.appendChild(categoryElement);
}

// Get DOM elements
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteButton = document.getElementById('newQuote');

// Function to display a random quote
function showRandomQuote() {
    showRandomQuoteFromFiltered();
}

// Function to create and display the add quote form
function createAddQuoteForm() {
    // Clear the quote display area
    quoteDisplay.innerHTML = '';
    
    // Create form container
    const formContainer = document.createElement('div');
    
    // Create form title
    const formTitle = document.createElement('h3');
    formTitle.textContent = 'Add New Quote';
    
    // Create quote text input
    const quoteTextLabel = document.createElement('label');
    quoteTextLabel.textContent = 'Quote Text:';
    
    const quoteTextInput = document.createElement('textarea');
    quoteTextInput.id = 'newQuoteText';
    quoteTextInput.placeholder = 'Enter your quote here...';
    
    // Create category input
    const categoryLabel = document.createElement('label');
    categoryLabel.textContent = 'Category:';
    
    const categoryInput = document.createElement('input');
    categoryInput.type = 'text';
    categoryInput.id = 'newQuoteCategory';
    categoryInput.placeholder = 'Enter category (e.g., motivation, life, success)';
    
    // Create buttons container
    const buttonsContainer = document.createElement('div');

    // Create add quote button
    const addButton = document.createElement('button');
    addButton.textContent = 'Add Quote';
    
    // Add event listeners
    addButton.addEventListener('click', function() {
        const newText = quoteTextInput.value.trim();
        const newCategory = categoryInput.value.trim().toLowerCase();
        
        if (newText && newCategory) {
            // Add new quote to the array
            quotes.push({ text: newText, category: newCategory });
            
            // Show success message
            alert('Quote added successfully!');
            
            // Clear the form and show a random quote
            showRandomQuote();
        } else {
            alert('Please fill in both the quote text and category.');
        }
    });

    
    // Append all elements to form container
    formContainer.appendChild(formTitle);
    formContainer.appendChild(quoteTextLabel);
    formContainer.appendChild(quoteTextInput);
    formContainer.appendChild(categoryLabel);
    formContainer.appendChild(categoryInput);
    formContainer.appendChild(buttonsContainer);
    buttonsContainer.appendChild(addButton);
    buttonsContainer.appendChild(cancelButton);
    
    // Append form container to quote display
    quoteDisplay.appendChild(formContainer);
}

// Add event listener to the "Show New Quote" button
newQuoteButton.addEventListener('click', function() {
    filterQuotes(); 
});

// Display a random quote when the page loads
document.addEventListener('DOMContentLoaded', showRandomQuote);

function addQuote() {
    const newText = document.getElementById('newQuoteText').value.trim();
    const newCategory = document.getElementById('newQuoteCategory').value.trim().toLowerCase();
    
    if (newText && newCategory) {
        // Clear the input fields
        document.getElementById('newQuoteText').value = '';
        document.getElementById('newQuoteCategory').value = '';
        
        // Add quote with server sync
        addQuoteWithSync(newText, newCategory);
        
        alert('Quote added successfully!');
    } else {
        alert('Please fill in both the quote text and category.');
    }
}

//Export/import Function
function exportToJson() {
    const dataStr = JSON.stringify(quotes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'quotes.json';
    downloadLink.click();
    
    URL.revokeObjectURL(url);
}

function importFromJsonFile(event) {
    const fileReader = new FileReader();
    fileReader.onload = function(event) {
        try {
            const importedQuotes = JSON.parse(event.target.result);
            quotes.push(...importedQuotes);
            saveQuotes();
            alert('Quotes imported successfully!');
            populateCategories();
            filterQuotes();
            showRandomQuote();
        } catch (error) {
            alert('Error importing file. Please ensure it\'s a valid JSON file.');
        }
    };
    fileReader.readAsText(event.target.files[0]);
}

document.addEventListener('DOMContentLoaded', function() {
    loadQuotes();
    populateCategories();
    filterQuotes();
    
    // Start periodic sync
    startPeriodicSync();
    
    // Initial sync
    setTimeout(() => {
        syncWithServer();
    }, 2000);
});

// Add cleanup when page unloads
window.addEventListener('beforeunload', function() {
    stopPeriodicSync();
});
