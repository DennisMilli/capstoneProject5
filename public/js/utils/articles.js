import { fetchJSON } from "./fetch.js";
import { $, $all } from "./dom.js";

export function observeArticleCards(container = document) {
    const cards = $all(".article-card", container); // ✅ correct way
  
    if (cards.length === 0) return;
  
    // Add direction classes before observer starts
    cards.forEach((card, index) => {
      card.classList.add(index % 2 === 0 ? "from-left" : "from-right");
    });
  
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.intersectionRatio > 0.2) {
            entry.target.classList.add("visible");
          } else if (entry.intersectionRatio < 0.1) {
            entry.target.classList.remove("visible");
          }
        });
      },
      { threshold: [0, 0.1, 0.2, 0.5, 1] }
    );
  
    cards.forEach(card => observer.observe(card));
}
  
export function createArticleCard(article, index = 0) {
  const card = document.createElement("article");
  card.className = `article-card ${index % 2 === 0 ? "from-left" : "from-right"}`;
  card.dataset.id = article.id;
  card.innerHTML = `
    <a href="/article/${article.slug}" class="article-link">
      <div class="selection-checkbox"></div>
        <img src="${article.image}" alt="${article.title}" class="article-img" />
        <div class="article-content">
          <h3 class="article-title">${article.title}</h3>
          <p class="article-summary">${article.summary}</p>
          <div class="article-meta">
          <p class="upload-time">${article.time} | ${article.category}</p>
          <svg class="share-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          class="lucide lucide-forward">
          <path d="m15 17 5-5-5-5"/>
          <path d="M4 18v-2a4 4 0 0 1 4-4h12"/>
          </svg>
        </div>
      </div>
    </a>
  `;
  return card;
}
  
export function handleShowMore(gridSelector, buttonSelector) {
    const grid = $(gridSelector);
    const showMoreBtn = $(buttonSelector);
    if (!grid || !showMoreBtn) return;
  
    let currentIndex = grid.children.length;
  
    showMoreBtn.addEventListener("click", async () => {
        showMoreBtn.disabled = true;
        showMoreBtn.textContent = "Loading...";
  
      const newArticles = await fetchJSON(
        `/load-more-articles?start=${currentIndex}&limit=4`
      );
  
      newArticles.forEach((article, i) => {
        const card = createArticleCard(article, currentIndex + i);
        grid.appendChild(card);
      });
  
      observeArticleCards(grid);
  
      currentIndex += newArticles.length;
      showMoreBtn.disabled = false;
      showMoreBtn.textContent = "Show More";
  
      if (newArticles.length < 4) showMoreBtn.style.display = "none";
    });
}
  
export function shareArticle(slug, title = "Check this out!") {
    const url = `${window.location.origin}/article/${slug}`;
  
    if (navigator.share) {
      return navigator.share({
        title,
        text: "Check out this dope football website",
        url
      })
      .catch(() => console.log("Share dismissed"));
    }
  
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard ✅");
}

export async function likeArticle(commentOrArticleSlug, isComment = false) {
    const endpoint = isComment
      ? `/comment/${commentOrArticleSlug}/like`
      : `/article/${commentOrArticleSlug}/like`;
  
    return await fetchJSON(endpoint, { method: "POST" });
}
  