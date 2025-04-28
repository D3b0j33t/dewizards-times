// Constants and Variables
const API_KEY = "526O6sHKAhweBxQCqlf8ZJRrWwecVBioFH3nDEcD"; // Default API key for development
let currentPage = 1;
let currentCategory = "all";
let isLoading = false;

// DOM Elements
const newsGrid = document.getElementById("newsGrid");
const loadingSpinner = document.getElementById("loadingSpinner");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const searchForm = document.querySelector(".search-form");
const searchInput = document.getElementById("searchInput");
const themeToggle = document.getElementById("themeToggle");
const body = document.body;
const categoryPills = document.querySelectorAll(".pill");
const featuredArticle = document.getElementById("featuredArticle");
const newsHeading = document.getElementById("newsHeading");
const homeLink = document.getElementById("homeLink");
const trendsLink = document.getElementById("trendsLink");
const categoryLinks = document.querySelectorAll(".dropdown-menu li");

// Date Display
function setCurrentDate() {
  const date = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById("currentDate").textContent = date.toLocaleDateString('en-US', options);
}

// Theme Toggle Functionality
function initThemeToggle() {
  // Check for saved preference
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    body.classList.add("light-mode");
    themeToggle.checked = true;
  } else if (savedTheme === null) {
    // Check system preference
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (!prefersDarkScheme) {
      body.classList.add("light-mode");
      themeToggle.checked = true;
      localStorage.setItem("theme", "light");
    } else {
      localStorage.setItem("theme", "dark");
    }
  }

  // Toggle event listener
  themeToggle.addEventListener("change", () => {
    if (themeToggle.checked) {
      body.classList.add("light-mode");
      localStorage.setItem("theme", "light");
    } else {
      body.classList.remove("light-mode");
      localStorage.setItem("theme", "dark");
    }
  });
}

// Format Date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// API Call to Fetch News
async function fetchNews(category = "all", page = 1, query = "") {
  isLoading = true;
  showLoadingSpinner();

  // Construct API URL
  let url = `https://api.thenewsapi.com/v1/news/top?api_token=${API_KEY}&locale=us&limit=9&page=${page}`;
  
  if (category !== "all") {
    url += `&categories=${category}`;
  }
  
  if (query) {
    url += `&search=${encodeURIComponent(query)}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    hideLoadingSpinner();
    isLoading = false;
    
    return data.data || [];
  } catch (error) {
    console.error("Error fetching news:", error);
    hideLoadingSpinner();
    isLoading = false;
    showErrorMessage("Failed to load news. Please try again later.");
    return [];
  }
}

// Display News in Grid
function displayNews(articles, append = false) {
  if (!append) {
    newsGrid.innerHTML = "";
  }
  
  if (articles.length === 0 && !append) {
    newsGrid.innerHTML = `
      <div class="col-12">
        <div class="error-message">
          No news articles found. Please try a different category or search term.
        </div>
      </div>
    `;
    return;
  }
  
  let newsHTML = "";
  
  articles.forEach(article => {
    // Get category for display
    const category = article.categories && article.categories.length > 0 
      ? article.categories[0] 
      : "general";
      
    newsHTML += `
      <div class="col-md-6 col-lg-4">
        <div class="glass-card news-card">
          <div class="news-img-container">
            <span class="news-category">${category}</span>
            <img src="${article.image_url || '/api/placeholder/400/200'}" 
                 alt="${article.title}" 
                 class="news-img"
                 onerror="this.src='/api/placeholder/400/200'">
          </div>
          <div class="news-body">
            <div class="news-date">
              <i class="far fa-calendar-alt"></i>
              ${formatDate(article.published_at)}
            </div>
            <h3 class="news-title">${article.title}</h3>
            <p class="news-text">${article.description || article.snippet || "No description available."}</p>
            <div class="news-source">
              <i class="fas fa-newspaper"></i>
              ${article.source || "Unknown Source"}
            </div>
            <a href="${article.url}" target="_blank" class="read-more">Read More</a>
          </div>
        </div>
      </div>
    `;
  });
  
  if (append) {
    newsGrid.innerHTML += newsHTML;
  } else {
    newsGrid.innerHTML = newsHTML;
  }
}

// Featured Article Display
function displayFeaturedArticle(article) {
  if (!article) return;
  
  featuredArticle.innerHTML = `
    <img src="${article.image_url || '/api/placeholder/600/300'}" 
         alt="${article.title}" 
         class="article-img"
         onerror="this.src='/api/placeholder/600/300'">
    <div class="article-content">
      <div class="article-date">${formatDate(article.published_at)}</div>
      <h3 class="article-title">${article.title}</h3>
      <p class="article-description">${article.description || article.snippet || "No description available."}</p>
      <div class="article-source">
        Source: ${article.source || "Unknown Source"}
      </div>
    </div>
  `;
}

// Loading Spinner Functions
function showLoadingSpinner() {
  loadingSpinner.style.display = "flex";
  loadMoreBtn.style.display = "none";
}

function hideLoadingSpinner() {
  loadingSpinner.style.display = "none";
  loadMoreBtn.style.display = "block";
}

// Error Message Display
function showErrorMessage(message) {
  newsGrid.innerHTML = `
    <div class="col-12">
      <div class="error-message">
        ${message}
      </div>
    </div>
  `;
}

// Load News by Category
async function loadNewsByCategory(category, resetPage = true) {
  if (resetPage) {
    currentPage = 1;
    currentCategory = category;
    
    // Update active pill
    categoryPills.forEach(pill => {
      if (pill.dataset.category === category) {
        pill.classList.add("active");
      } else {
        pill.classList.remove("active");
      }
    });
    
    // Update heading based on category
    const formattedCategory = category === "all" ? "Latest" : category.charAt(0).toUpperCase() + category.slice(1);
    newsHeading.textContent = `${formattedCategory} News`;
  }
  
  const articles = await fetchNews(category, currentPage);
  
  // If first page, use first article as featured (only on home/all)
  if (resetPage && category === "all" && articles.length > 0) {
    displayFeaturedArticle(articles[0]);
    displayNews(articles.slice(1));
  } else {
    displayNews(articles, !resetPage);
  }
}

// Load More News
async function loadMoreNews() {
  if (isLoading) return;
  
  currentPage++;
  await loadNewsByCategory(currentCategory, false);
}

// Search News
async function searchNews(query) {
  currentPage = 1;
  currentCategory = "all";
  newsHeading.textContent = `Search Results: "${query}"`;
  
  // Reset active pills
  categoryPills.forEach(pill => pill.classList.remove("active"));
  categoryPills[0].classList.add("active");
  
  const articles = await fetchNews("all", 1, query);
  displayNews(articles);
}

// Trending News
async function loadTrendingNews() {
  currentPage = 1;
  currentCategory = "all";
  newsHeading.textContent = "Trending News";
  
  // Reset active pills
  categoryPills.forEach(pill => pill.classList.remove("active"));
  
  // For trending, we could use a specific endpoint if available
  // For now, we'll simulate trending with general news
  const articles = await fetchNews("all", 1);
  displayNews(articles);
}

// Event Listeners
function setupEventListeners() {
  // Load more button
  loadMoreBtn.addEventListener("click", loadMoreNews);
  
  // Category pills
  categoryPills.forEach(pill => {
    pill.addEventListener("click", () => {
      const category = pill.dataset.category;
      loadNewsByCategory(category);
    });
  });
  
  // Search form
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
      searchNews(query);
    }
  });
  
  // Navigation links
  homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    loadNewsByCategory("all");
  });
  
  trendsLink.addEventListener("click", (e) => {
    e.preventDefault();
    loadTrendingNews();
  });
  
  // Dropdown category links
  categoryLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const category = link.dataset.category;
      loadNewsByCategory(category);
    });
  });
}

// Initialization
document.addEventListener("DOMContentLoaded", async () => {
  // Set current date in header
  setCurrentDate();
  
  // Initialize theme toggle
  initThemeToggle();
  
  // Setup event listeners
  setupEventListeners();
  
  // Initial news load
  await loadNewsByCategory("all");
});