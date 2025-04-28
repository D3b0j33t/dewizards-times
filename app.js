// Constants and Configuration
const API_KEY = "526O6sHKAhweBxQCqlf8ZJRrWwecVBioFH3nDEcD"; // Default API key for development
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const BREAKING_NEWS_REFRESH = 5 * 60 * 1000; // 5 minutes

// State Management
let currentPage = 1;
let currentCategory = "all";
let isLoading = false;
let newsCache = {}; // Cache for storing fetched news
let savedArticles = []; // For bookmarked articles
let articleViewStats = {}; // Track article views
let breakingNewsInterval = null;
let currentArticleForModal = null; // Currently displayed article in modal
let speechSynthesis = null; // For text-to-speech
let isSpeaking = false; // Track speech status
let readingMode = false; // Track reading mode

// DOM Elements
const newsGrid = document.getElementById("newsGrid");
const loadingSpinner = document.getElementById("loadingSpinner");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const searchForm = document.querySelector(".search-form");
const searchInput = document.getElementById("searchInput");
const themeToggle = document.getElementById("themeToggle");
const body = document.body;
const categoryPills = document.querySelectorAll(".pill");
const carouselInner = document.getElementById("carouselInner");
const newsHeading = document.getElementById("newsHeading");
const homeLink = document.getElementById("homeLink");
const trendsLink = document.getElementById("trendsLink");
const savedArticlesLink = document.getElementById("savedArticlesLink");
const categoryLinks = document.querySelectorAll(".dropdown-menu li");
const currentYear = document.getElementById("currentYear");
const readingModeToggle = document.getElementById("readingModeToggle");
const mostReadSection = document.getElementById("mostReadSection");
const mostReadGrid = document.getElementById("mostReadGrid");
const breakingNewsBanner = document.getElementById("breakingNewsBanner");
const breakingNewsMarquee = document.getElementById("breakingNewsMarquee");
const closeBreaking = document.getElementById("closeBreaking");
const articleViewModal = document.getElementById("articleViewModal");
const articleModalBody = document.getElementById("articleModalBody");
const speakArticleBtn = document.getElementById("speakArticleBtn");
const shareArticleBtn = document.getElementById("shareArticleBtn");
const bookmarkArticleBtn = document.getElementById("bookmarkArticleBtn");
const shareModal = document.getElementById("shareModal");
const shareLink = document.getElementById("shareLink");
const copyLinkBtn = document.querySelector(".copy-link-btn");
const notificationToast = document.getElementById("notificationToast");
const toastTitle = document.getElementById("toastTitle");
const toastMessage = document.getElementById("toastMessage");

// Bootstrap Components
let toastBootstrap = null;
let articleModalBootstrap = null;
let shareModalBootstrap = null;
let carouselBootstrap = null;

// Initialize Bootstrap Components
function initBootstrapComponents() {
  if (notificationToast) {
    toastBootstrap = new bootstrap.Toast(notificationToast);
  }
  
  if (articleViewModal) {
    articleModalBootstrap = new bootstrap.Modal(articleViewModal);
  }
  
  if (shareModal) {
    shareModalBootstrap = new bootstrap.Modal(shareModal);
  }
  
  if (document.getElementById("featuredCarousel")) {
    carouselBootstrap = new bootstrap.Carousel(document.getElementById("featuredCarousel"), {
      interval: 5000,
      pause: 'hover'
    });
  }
}

// Date & Time Utilities
function setCurrentDate() {
  const date = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  
  if (document.getElementById("currentDate")) {
    document.getElementById("currentDate").textContent = date.toLocaleDateString('en-US', options);
  }
  
  // Set copyright year
  if (currentYear) {
    currentYear.textContent = date.getFullYear();
  }
}

function formatDate(dateString) {
  if (!dateString) return "No date available";
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Invalid date";
  }
}

function calculateReadingTime(text) {
  if (!text) return "1 min";
  
  // Average reading speed (words per minute)
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  
  return `${minutes} min${minutes > 1 ? 's' : ''}`;
}

// Theme Toggle Functionality
function initThemeToggle() {
  if (!themeToggle) return;
  
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

// Reading Mode Toggle
function initReadingModeToggle() {
  if (!readingModeToggle) return;
  
  // Check for saved preference
  const savedReadingMode = localStorage.getItem("readingMode") === "true";
  if (savedReadingMode) {
    body.classList.add("reading-mode");
    readingMode = true;
  }
  
  readingModeToggle.addEventListener("click", () => {
    if (body.classList.contains("reading-mode")) {
      body.classList.remove("reading-mode");
      readingMode = false;
      localStorage.setItem("readingMode", "false");
      showNotification("Reading Mode", "Reading mode disabled");
    } else {
      body.classList.add("reading-mode");
      readingMode = true;
      localStorage.setItem("readingMode", "true");
      showNotification("Reading Mode", "Reading mode enabled for better focus");
    }
  });
}

// Local Storage Management
function loadSavedArticles() {
  const saved = localStorage.getItem("savedArticles");
  if (saved) {
    try {
      savedArticles = JSON.parse(saved);
    } catch (e) {
      savedArticles = [];
      console.error("Error parsing saved articles", e);
    }
  }
}

function saveArticle(article) {
  if (!article || !article.uuid) return false;
  
  // Check if already saved
  const existingIndex = savedArticles.findIndex(a => a.uuid === article.uuid);
  
  if (existingIndex !== -1) {
    // Article already saved, remove it
    savedArticles.splice(existingIndex, 1);
    localStorage.setItem("savedArticles", JSON.stringify(savedArticles));
    return false;
  } else {
    // Save article
    savedArticles.push(article);
    localStorage.setItem("savedArticles", JSON.stringify(savedArticles));
    return true;
  }
}

function isArticleSaved(articleId) {
  return savedArticles.some(article => article.uuid === articleId);
}

function loadViewStats() {
  const stats = localStorage.getItem("articleViewStats");
  if (stats) {
    try {
      articleViewStats = JSON.parse(stats);
    } catch (e) {
      articleViewStats = {};
      console.error("Error parsing article view stats", e);
    }
  }
}

function recordArticleView(articleId) {
  if (!articleId) return;
  
  if (!articleViewStats[articleId]) {
    articleViewStats[articleId] = 1;
  } else {
    articleViewStats[articleId]++;
  }
  
  localStorage.setItem("articleViewStats", JSON.stringify(articleViewStats));
  updateMostReadSection();
}

// API Data Management
async function fetchNews(category = "all", page = 1, query = "") {
  isLoading = true;
  showLoadingSpinner();
  
  // Create a cache key based on the request parameters
  const cacheKey = `${category}_${page}_${query}`;
  
  // Check if we have valid cached data
  const now = new Date().getTime();
  if (newsCache[cacheKey] && (now - newsCache[cacheKey].timestamp) < CACHE_DURATION) {
    console.log("Using cached data for:", cacheKey);
    hideLoadingSpinner();
    isLoading = false;
    return newsCache[cacheKey].data;
  }

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
    
    // Cache the results with timestamp
    const articles = data.data || [];
    newsCache[cacheKey] = {
      data: articles,
      timestamp: now
    };
    
    return articles;
  } catch (error) {
    console.error("Error fetching news:", error);
    hideLoadingSpinner();
    isLoading = false;
    showErrorMessage("Failed to load news. Please try again later.");
    return [];
  }
}

// Breaking News Management
async function fetchBreakingNews() {
  try {
    const response = await fetch(`https://api.thenewsapi.com/v1/news/top?api_token=${API_KEY}&locale=us&limit=5`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    const articles = data.data || [];
    
    if (articles.length > 0) {
      displayBreakingNews(articles);
    }
  } catch (error) {
    console.error("Error fetching breaking news:", error);
  }
}

function displayBreakingNews(articles) {
  if (!breakingNewsMarquee || articles.length === 0) return;
  
  let breakingContent = "";
  
  articles.forEach((article, index) => {
    breakingContent += `
      <span class="breaking-item" data-id="${article.uuid}">
        ${article.title || "Breaking News Update"} 
        ${index < articles.length - 1 ? ' • ' : ''}
      </span>
    `;
  });
  
  breakingNewsMarquee.innerHTML = breakingContent;
  breakingNewsBanner.style.display = "block";
  
  // Add click event to breaking news items
  document.querySelectorAll('.breaking-item').forEach(item => {
    item.addEventListener('click', () => {
      const articleId = item.dataset.id;
      const article = articles.find(a => a.uuid === articleId);
      if (article) {
        openArticleModal(article);
      }
    });
  });
}

function startBreakingNewsRefresh() {
  fetchBreakingNews(); // Initial fetch
  
  // Set interval for refresh
  if (breakingNewsInterval) {
    clearInterval(breakingNewsInterval);
  }
  
  breakingNewsInterval = setInterval(fetchBreakingNews, BREAKING_NEWS_REFRESH);
}

// Display Utilities
function showLoadingSpinner() {
  if (loadingSpinner) {
    loadingSpinner.style.display = "flex";
  }
  if (loadMoreBtn) {
    loadMoreBtn.style.display = "none";
  }
}

function hideLoadingSpinner() {
  if (loadingSpinner) {
    loadingSpinner.style.display = "none";
  }
  if (loadMoreBtn && !isLoading) {
    loadMoreBtn.style.display = "block";
  }
}

function showErrorMessage(message) {
  if (!newsGrid) return;
  
  newsGrid.innerHTML = `
    <div class="col-12">
      <div class="error-message">
        <i class="fas fa-exclamation-triangle me-2"></i>
        ${message}
      </div>
    </div>
  `;
  
  if (loadMoreBtn) {
    loadMoreBtn.style.display = "none";
  }
}

function showNotification(title, message) {
  if (!toastBootstrap) return;
  
  if (toastTitle) {
    toastTitle.textContent = title;
  }
  
  if (toastMessage) {
    toastMessage.textContent = message;
  }
  
  toastBootstrap.show();
}

// Category-Specific Styling
function getCategoryClass(category) {
  if (!category) return 'general';
  
  category = category.toLowerCase();
  
  // Map API categories to our CSS classes
  const categoryMap = {
    'general': 'general',
    'business': 'business',
    'tech': 'technology',
    'technology': 'technology',
    'science': 'science',
    'health': 'health',
    'sports': 'sports',
    'entertainment': 'entertainment',
    'politics': 'politics',
    'world': 'world',
  };
  
  return categoryMap[category] || 'general';
}

// Content Display Functions
function displayCarousel(articles) {
  if (!carouselInner || articles.length === 0) return;
  
  let carouselHTML = '';
  
  // Use up to 5 articles for carousel
  const carouselArticles = articles.slice(0, 5);
  
  carouselArticles.forEach((article, index) => {
    // Get category class for styling
    const categoryClass = getCategoryClass(
      article.categories && article.categories.length > 0 ? article.categories[0] : 'general'
    );
    
    // Use a default image if none is provided
    const imageUrl = article.image_url || 'https://via.placeholder.com/800x400?text=No+Image+Available';
    
    carouselHTML += `
      <div class="carousel-item ${index === 0 ? 'active' : ''}" data-article-id="${article.uuid}">
        <img src="${imageUrl}" 
             class="carousel-img" 
             alt="${article.title || 'Featured news'}"
             onerror="this.src='https://via.placeholder.com/800x400?text=Image+Not+Available'">
        <div class="carousel-caption d-block">
          <span class="carousel-category ${categoryClass}">${article.categories && article.categories.length > 0 ? article.categories[0] : 'General'}</span>
          <h5 class="carousel-title">${article.title || 'Untitled Article'}</h5>
          <div class="carousel-info d-flex justify-content-between align-items-center">
            <span>${formatDate(article.published_at)}</span>
            <span>${calculateReadingTime(article.description || article.snippet)} read</span>
          </div>
        </div>
      </div>
    `;
  });
  
  carouselInner.innerHTML = carouselHTML;
  
  // Add click event listeners to carousel items
  document.querySelectorAll('.carousel-item').forEach(item => {
    item.addEventListener('click', () => {
      const articleId = item.dataset.articleId;
      const article = articles.find(a => a.uuid === articleId);
      if (article) {
        openArticleModal(article);
      }
    });
  });
}

function displayNews(articles, append = false) {
  if (!newsGrid) return;
  
  if (!append) {
    newsGrid.innerHTML = "";
  }
  
  if (articles.length === 0 && !append) {
    newsGrid.innerHTML = `
      <div class="col-12">
        <div class="error-message">
          <i class="fas fa-search me-2"></i>
          No news articles found. Please try a different category or search term.
        </div>
      </div>
    `;
    if (loadMoreBtn) {
      loadMoreBtn.style.display = "none";
    }
    return;
  }
  
  let newsHTML = "";
  
  articles.forEach(article => {
    // Get category class for styling
    const categoryClass = getCategoryClass(
      article.categories && article.categories.length > 0 ? article.categories[0] : 'general'
    );
    
    // Get category for display
    const category = article.categories && article.categories.length > 0 
      ? article.categories[0] 
      : "general";
      
    // Check if article is saved
    const isSaved = isArticleSaved(article.uuid);
    
    // Calculate estimated reading time
    const readTime = calculateReadingTime(article.description || article.snippet);
    
    // Use a default image if none is provided
    const imageUrl = article.image_url || 'https://via.placeholder.com/400x200?text=No+Image+Available';
    
    newsHTML += `
      <div class="col-md-6 col-lg-4 fade-in-up" style="animation-delay: ${append ? '0s' : Math.random() * 0.5 + 's'}">
        <div class="glass-card news-card" data-article-id="${article.uuid}">
          <div class="news-img-container">
            <span class="news-category ${categoryClass}">${category}</span>
            <img src="${imageUrl}" 
                 alt="${article.title || 'News article'}" 
                 class="news-img"
                 onerror="this.src='https://via.placeholder.com/400x200?text=Image+Not+Available'">
          </div>
          <div class="news-body">
            <div class="news-date">
              <i class="far fa-calendar-alt"></i>
              ${formatDate(article.published_at)}
            </div>
            <h3 class="news-title">${article.title || 'Untitled Article'}</h3>
            <p class="news-text">${article.description || article.snippet || "No description available."}</p>
            <div class="news-meta">
              <div class="news-source">
                <i class="fas fa-newspaper"></i>
                ${article.source || "Unknown Source"}
              </div>
              <div class="read-time">
                <i class="fas fa-clock"></i>
                ${readTime} read
              </div>
            </div>
            <div class="news-actions mb-3">
              <button class="action-icon bookmark-icon ${isSaved ? 'active' : ''}" 
                      data-article-id="${article.uuid}" 
                      aria-label="${isSaved ? 'Remove bookmark' : 'Save article'}">
                <i class="${isSaved ? 'fas' : 'far'} fa-bookmark"></i>
              </button>
              <button class="action-icon share-icon" 
                      data-article-id="${article.uuid}" 
                      aria-label="Share article">
                <i class="fas fa-share-alt"></i>
              </button>
            </div>
            <button class="read-more view-article" data-article-id="${article.uuid}">Read Article</button>
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
  
  // Show/hide load more button based on article count
  if (loadMoreBtn) {
    loadMoreBtn.style.display = articles.length > 0 ? "block" : "none";
  }
  
  // Add event listeners to article cards
  setupArticleCardListeners();
}

function displaySavedArticles() {
  if (!newsGrid) return;
  
  if (savedArticles.length === 0) {
    newsGrid.innerHTML = `
      <div class="col-12">
        <div class="error-message">
          <i class="fas fa-bookmark me-2"></i>
          You haven't saved any articles yet. Articles you bookmark will appear here.
        </div>
      </div>
    `;
    if (loadMoreBtn) {
      loadMoreBtn.style.display = "none";
    }
    return;
  }
  
  displayNews(savedArticles, false);
  
  // Update heading
  if (newsHeading) {
    newsHeading.textContent = "Saved Articles";
  }
  
  // Hide load more button
  if (loadMoreBtn) {
    loadMoreBtn.style.display = "none";
  }
}

function updateMostReadSection() {
  if (!mostReadSection || !mostReadGrid) return;
  
  // Get articles with view stats
  const articlesWithStats = [];
  
  for (const articleId in articleViewStats) {
    // Find the article in our cache or saved articles
    let article = null;
    
    // Check in cache
    for (const cacheKey in newsCache) {
      if (newsCache[cacheKey].data) {
        article = newsCache[cacheKey].data.find(a => a.uuid === articleId);
        if (article) break;
      }
    }
    
    // Check in saved articles if not found in cache
    if (!article) {
      article = savedArticles.find(a => a.uuid === articleId);
    }
    
    if (article) {
      articlesWithStats.push({
        ...article,
        views: articleViewStats[articleId]
      });
    }
  }
  
  // Sort by views (most viewed first)
  articlesWithStats.sort((a, b) => b.views - a.views);
  
  // Display top 6 most read articles
  const mostRead = articlesWithStats.slice(0, 6);
  
  if (mostRead.length > 0) {
    let mostReadHTML = "";
    
    mostRead.forEach(article => {
      // Get category for styling
      const categoryClass = getCategoryClass(
        article.categories && article.categories.length > 0 ? article.categories[0] : 'general'
      );
      
      // Get category for display
      const category = article.categories && article.categories.length > 0 
        ? article.categories[0] 
        : "general";
      
      // Use a default image if none is provided
      const imageUrl = article.image_url || 'https://via.placeholder.com/400x200?text=No+Image+Available';
      
      mostReadHTML += `
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="glass-card most-read-card" data-article-id="${article.uuid}">
            <img src="${imageUrl}" 
                 alt="${article.title || 'Most read article'}" 
                 class="most-read-img"
                 onerror="this.src='https://via.placeholder.com/400x200?text=Image+Not+Available'">
            <div class="most-read-content">
              <div class="most-read-category ${categoryClass}">${category}</div>
              <h4 class="most-read-title">${article.title || 'Untitled Article'}</h4>
              <div class="most-read-info">
                <span>${formatDate(article.published_at)}</span>
                <span class="views-count">
                  <i class="fas fa-eye"></i> ${article.views}
                </span>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    
    mostReadGrid.innerHTML = mostReadHTML;
    mostReadSection.style.display = "block";
    
    // Add event listeners to most read cards
    document.querySelectorAll('.most-read-card').forEach(card => {
      card.addEventListener('click', () => {
        const articleId = card.dataset.articleId;
        const article = mostRead.find(a => a.uuid === articleId);
        if (article) {
          openArticleModal(article);
        }
      });
    });
    
  } else {
    mostReadSection.style.display = "none";
  }
}

function setupArticleCardListeners() {
  // View article buttons
  document.querySelectorAll('.view-article').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const articleId = btn.dataset.articleId;
      viewArticle(articleId);
    });
  });
  
  // Bookmark icons
  document.querySelectorAll('.bookmark-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const articleId = icon.dataset.articleId;
      toggleBookmark(articleId);
    });
  });
  
  // Share icons
  document.querySelectorAll('.share-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const articleId = icon.dataset.articleId;
      handleShareArticle(articleId);
    });
  });
  
  // Entire card click
  document.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', () => {
      const articleId = card.dataset.articleId;
      viewArticle(articleId);
    });
  });
}

// Article Actions
function viewArticle(articleId) {
  if (!articleId) return;
  
  // Find the article in cache or saved articles
  let article = null;
  
  // Check in cache
  for (const cacheKey in newsCache) {
    if (newsCache[cacheKey].data) {
      article = newsCache[cacheKey].data.find(a => a.uuid === articleId);
      if (article) break;
    }
  }
  
  // Check in saved articles if not found in cache
  if (!article) {
    article = savedArticles.find(a => a.uuid === articleId);
  }
  
  if (article) {
    // Record the view
    recordArticleView(articleId);
    
    // Open article modal
    openArticleModal(article);
  }
}

function toggleBookmark(articleId) {
  if (!articleId) return;
  
  // Find the article in cache or saved articles
  let article = null;
  
  // Check in cache
  for (const cacheKey in newsCache) {
    if (newsCache[cacheKey].data) {
      article = newsCache[cacheKey].data.find(a => a.uuid === articleId);
      if (article) break;
    }
  }
  
  // Check in saved articles if not found in cache
  if (!article && savedArticles.length > 0) {
    article = savedArticles.find(a => a.uuid === articleId);
  }
  
  if (article) {
    const isNowSaved = saveArticle(article);
    
    // Update bookmark icons for this article
    document.querySelectorAll(`.bookmark-icon[data-article-id="${articleId}"]`).forEach(icon => {
      if (isNowSaved) {
        icon.classList.add('active');
        icon.querySelector('i').classList.remove('far');
        icon.querySelector('i').classList.add('fas');
        icon.setAttribute('aria-label', 'Remove bookmark');
      } else {
        icon.classList.remove('active');
        icon.querySelector('i').classList.remove('fas');
        icon.querySelector('i').classList.add('far');
        icon.setAttribute('aria-label', 'Save article');
      }
    });
    
    // Show notification
    showNotification(
      isNowSaved ? "Article Saved" : "Article Removed",
      isNowSaved ? "Article saved to your bookmarks" : "Article removed from your bookmarks"
    );
    
    // If we're currently viewing saved articles, update the display
    if (newsHeading && newsHeading.textContent === "Saved Articles") {
      displaySavedArticles();
    }
  }
}

function handleShareArticle(articleId) {
  if (!articleId) return;
  
  // Find the article
  let article = null;
  
  // Check in cache
  for (const cacheKey in newsCache) {
    if (newsCache[cacheKey].data) {
      article = newsCache[cacheKey].data.find(a => a.uuid === articleId);
      if (article) break;
    }
  }
  
  // Check in saved articles if not found in cache
  if (!article) {
    article = savedArticles.find(a => a.uuid === articleId);
  }
  
  if (article) {
    openShareModal(article);
  }
}

// Modal Functions
function openArticleModal(article) {
  if (!articleModalBody || !articleModalBootstrap || !article) return;
  
  // Set the current article for reference
  currentArticleForModal = article;
  
  // Get category for styling
  const categoryClass = getCategoryClass(
    article.categories && article.categories.length > 0 ? article.categories[0] : 'general'
  );
  
  // Get category for display
  const category = article.categories && article.categories.length > 0 
    ? article.categories[0] 
    : "general";
  
  // Use a default image if none is provided
  const imageUrl = article.image_url || 'https://via.placeholder.com/800x400?text=No+Image+Available';
  
  // Check if article is saved
  const isSaved = isArticleSaved(article.uuid);
  
  // Format content
  const content = article.description || article.snippet || "No content available for this article.";
  
  // Modify modal title
  document.getElementById('articleViewModalLabel').textContent = category;
  
  // Set bookmark button status
  if (bookmarkArticleBtn) {
    if (isSaved) {
      bookmarkArticleBtn.classList.add('active');
      bookmarkArticleBtn.querySelector('i').classList.remove('far');
      bookmarkArticleBtn.querySelector('i').classList.add('fas');
    } else {
      bookmarkArticleBtn.classList.remove('active');
      bookmarkArticleBtn.querySelector('i').classList.remove('fas');
      bookmarkArticleBtn.querySelector('i').classList.add('far');
    }
  }
  
  // Set modal content
  articleModalBody.innerHTML = `
    <img src="${imageUrl}" 
         alt="${article.title || 'Article image'}" 
         class="article-modal-img"
         onerror="this.src='https://via.placeholder.com/800x400?text=Image+Not+Available'">
         
    <h2 class="article-modal-title">${article.title || 'Untitled Article'}</h2>
    
    <div class="article-modal-meta">
      <div class="article-modal-source">
        <i class="fas fa-newspaper"></i>
        ${article.source || "Unknown Source"}
      </div>
      <div class="article-modal-date">
        <i class="far fa-calendar-alt"></i>
        ${formatDate(article.published_at)}
      </div>
    </div>
    
    <div class="article-modal-content">
      ${content}
      <p class="mt-4">
        <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
          Read Full Article on ${article.source || "Source"}
        </a>
      </p>
    </div>
  `;
  
  // Show the modal
  articleModalBootstrap.show();
}

function openShareModal(article) {
  if (!shareModal || !shareModalBootstrap || !article) return;
  
  // Set the share link
  if (shareLink) {
    shareLink.value = article.url;
  }
  
  // Set up share button actions
  document.querySelector('.twitter-share')?.addEventListener('click', () => {
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(article.url)}&text=${encodeURIComponent(article.title)}`;
    window.open(shareUrl, '_blank');
  });
  
  document.querySelector('.facebook-share')?.addEventListener('click', () => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(article.url)}`;
    window.open(shareUrl, '_blank');
  });
  
  document.querySelector('.linkedin-share')?.addEventListener('click', () => {
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(article.url)}`;
    window.open(shareUrl, '_blank');
  });
  
  document.querySelector('.whatsapp-share')?.addEventListener('click', () => {
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(article.title + ' ' + article.url)}`;
    window.open(shareUrl, '_blank');
  });
  
  // Show the modal
  shareModalBootstrap.show();
}

// Text-to-Speech
function initTextToSpeech() {
  if (!('speechSynthesis' in window)) {
    console.log('Text-to-speech not supported');
    // Hide speak button if not supported
    if (speakArticleBtn) {
      speakArticleBtn.style.display = 'none';
    }
    return;
  }
  
  speechSynthesis = window.speechSynthesis;
}

function toggleSpeech() {
  if (!speechSynthesis || !currentArticleForModal) return;
  
  if (isSpeaking) {
    // Stop speaking
    speechSynthesis.cancel();
    isSpeaking = false;
    
    if (speakArticleBtn) {
      speakArticleBtn.classList.remove('active');
      speakArticleBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    }
    
  } else {
    // Start speaking
    const text = currentArticleForModal.title + '. ' + 
                (currentArticleForModal.description || currentArticleForModal.snippet || '');
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set properties
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Set callback
    utterance.onend = function() {
      isSpeaking = false;
      if (speakArticleBtn) {
        speakArticleBtn.classList.remove('active');
        speakArticleBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
      }
    };
    
    // Speak
    speechSynthesis.speak(utterance);
    isSpeaking = true;
    
    if (speakArticleBtn) {
      speakArticleBtn.classList.add('active');
      speakArticleBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    }
  }
}

// Copy Link Function
function copyToClipboard(text) {
  // Modern approach with clipboard API
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showNotification("Link Copied", "Article link copied to clipboard");
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        fallbackCopyToClipboard(text);
      });
  } else {
    fallbackCopyToClipboard(text);
  }
}

function fallbackCopyToClipboard(text) {
  // Fallback for browsers without clipboard API
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Make the textarea out of viewport
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showNotification("Link Copied", "Article link copied to clipboard");
    } else {
      showNotification("Copy Failed", "Unable to copy link to clipboard");
    }
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
    showNotification("Copy Failed", "Unable to copy link to clipboard");
  }
  
  document.body.removeChild(textArea);
}

// Main News Functions
async function loadNewsByCategory(category, resetPage = true) {
  try {
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
      if (newsHeading) {
        newsHeading.textContent = `${formattedCategory} News`;
      }
    }
    
    const articles = await fetchNews(category, currentPage);
    
    // If first page, use first 5 articles for carousel
    if (resetPage && articles.length > 0) {
      displayCarousel(articles);
      
      // Display remaining articles in grid
      // If there are more than 5 articles, slice from 6th
      if (articles.length > 5) {
        displayNews(articles.slice(5));
      } else {
        // Load a fresh set for the grid if we don't have enough
        const gridArticles = await fetchNews(category, 2);
        displayNews(gridArticles);
      }
    } else {
      displayNews(articles, !resetPage);
    }
    
    // Update most read section
    updateMostReadSection();
    
    // Stop the loading state
    isLoading = false;
    if (loadingSpinner) loadingSpinner.style.display = "none";
    if (loadMoreBtn) loadMoreBtn.style.display = "block";
    
  } catch (error) {
    console.error("Error in loadNewsByCategory:", error);
    showErrorMessage("An error occurred while loading news. Please try again later.");
  }
}

async function loadMoreNews() {
  if (isLoading) return;
  
  try {
    currentPage++;
    await loadNewsByCategory(currentCategory, false);
  } catch (error) {
    console.error("Error in loadMoreNews:", error);
    showErrorMessage("Failed to load more news. Please try again later.");
  }
}

async function searchNews(query) {
  if (!query.trim()) {
    // If search is empty, just load the home page
    loadNewsByCategory("all");
    return;
  }
  
  try {
    currentPage = 1;
    currentCategory = "all";
    
    if (newsHeading) {
      newsHeading.textContent = `Search Results: "${query}"`;
    }
    
    // Reset active pills
    categoryPills.forEach(pill => pill.classList.remove("active"));
    document.querySelector('.pill[data-category="all"]')?.classList.add("active");
    
    const articles = await fetchNews("all", 1, query);
    displayNews(articles);
    
    // Hide the carousel when searching
    if (carouselInner) {
      carouselInner.innerHTML = '';
    }
  } catch (error) {
    console.error("Error in searchNews:", error);
    showErrorMessage("Search failed. Please try again later.");
  }
}

async function loadTrendingNews() {
  try {
    currentPage = 1;
    currentCategory = "all";
    
    if (newsHeading) {
      newsHeading.textContent = "Trending News";
    }
    
    // Reset active pills
    categoryPills.forEach(pill => pill.classList.remove("active"));
    
    // For trending, use the regular API but maybe emphasize popular sources
    const articles = await fetchNews("all", 1);
    displayNews(articles);
    
    // Display carousel with top stories
    displayCarousel(articles.slice(0, 5));
  } catch (error) {
    console.error("Error in loadTrendingNews:", error);
    showErrorMessage("Failed to load trending news. Please try again later.");
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Load more button
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadMoreNews);
  }
  
  // Category pills
  categoryPills.forEach(pill => {
    pill.addEventListener("click", () => {
      const category = pill.dataset.category;
      loadNewsByCategory(category);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
  
  // Search form
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!searchInput) return;
      
      const query = searchInput.value.trim();
      searchNews(query);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
  // Navigation links
  if (homeLink) {
    homeLink.addEventListener("click", (e) => {
      e.preventDefault();
      loadNewsByCategory("all");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
  if (trendsLink) {
    trendsLink.addEventListener("click", (e) => {
      e.preventDefault();
      loadTrendingNews();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
  if (savedArticlesLink) {
    savedArticlesLink.addEventListener("click", (e) => {
      e.preventDefault();
      displaySavedArticles();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
  // Dropdown category links
  categoryLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const category = link.dataset.category;
      loadNewsByCategory(category);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
  
  // Breaking news close button
  if (closeBreaking) {
    closeBreaking.addEventListener("click", () => {
      breakingNewsBanner.style.display = "none";
    });
  }
  
  // Article modal action buttons
  if (speakArticleBtn) {
    speakArticleBtn.addEventListener("click", toggleSpeech);
  }
  
  if (shareArticleBtn) {
    shareArticleBtn.addEventListener("click", () => {
      if (currentArticleForModal) {
        openShareModal(currentArticleForModal);
      }
    });
  }
  
  if (bookmarkArticleBtn) {
    bookmarkArticleBtn.addEventListener("click", () => {
      if (currentArticleForModal) {
        toggleBookmark(currentArticleForModal.uuid);
      }
    });
  }
  
  // Copy link button
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", () => {
      if (shareLink) {
        copyToClipboard(shareLink.value);
      }
    });
  }
  
  // Cancel speech synthesis when modal closes
  if (articleViewModal) {
    articleViewModal.addEventListener('hidden.bs.modal', () => {
      if (isSpeaking && speechSynthesis) {
        speechSynthesis.cancel();
        isSpeaking = false;
      }
    });
  }

  // Handle newsletter submission
  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', handleNewsletterSubmit);
  }
}

// Newsletter subscription handler
function handleNewsletterSubmit(event) {
  event.preventDefault();
  const emailInput = event.target.querySelector('input[type="email"]');
  
  if (!emailInput) return;
  
  const email = emailInput.value.trim();
  
  if (!email) {
    showNotification("Subscription Failed", "Please enter a valid email address");
    return;
  }
  
  // Here you would typically send this to your backend
  // For now, just show a success message
  showNotification("Subscription Successful", "Thank you for subscribing to our newsletter!");
  emailInput.value = "";
}

// Keyboard Navigation
function setupKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    // ESC key to close modals
    if (e.key === 'Escape') {
      if (articleModalBootstrap) {
        articleModalBootstrap.hide();
      }
      if (shareModalBootstrap) {
        shareModalBootstrap.hide();
      }
    }
  });
}

// Error Handling for Images
function setupImageErrorHandling() {
  document.addEventListener('error', function(event) {
    if (event.target.tagName.toLowerCase() === 'img') {
      event.target.src = 'https://via.placeholder.com/400x200?text=Image+Not+Available';
    }
  }, true);
}

// Support for offline mode
function setupOfflineSupport() {
  window.addEventListener('online', function() {
    showNotification("You're Online", "Connected to the internet. Getting fresh content...");
    loadNewsByCategory(currentCategory);
  });
  
  window.addEventListener('offline', function() {
    showNotification("You're Offline", "Using cached content. Some features may be limited.");
  });
}

// Initialization
async function init() {
  try {
    // Set current date in header
    setCurrentDate();
    
    // Initialize Bootstrap components
    initBootstrapComponents();
    
    // Initialize theme toggle
    initThemeToggle();
    
    // Initialize reading mode toggle
    initReadingModeToggle();
    
    // Load saved articles from localStorage
    loadSavedArticles();
    
    // Load article view stats
    loadViewStats();
    
    // Initialize text-to-speech
    initTextToSpeech();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup keyboard navigation
    setupKeyboardNavigation();
    
    // Setup image error handling
    setupImageErrorHandling();
    
    // Setup offline support
    setupOfflineSupport();
    
    // Start breaking news refresh
    startBreakingNewsRefresh();
    
    // Initial news load
    await loadNewsByCategory("all");
    
  } catch (error) {
    console.error("Initialization error:", error);
    showErrorMessage("Failed to initialize the application. Please refresh the page.");
  }
}

// Start the application when DOM is fully loaded
document.addEventListener("DOMContentLoaded", init);
