import { observeArticleCards, handleShowMore, shareArticle, likeArticle } from "../utils/articles.js";
import { initCreateModal } from "../utils/modal.js";
import { $, on } from "../utils/dom.js";
import { fetchForm } from "../utils/fetch.js";

export default function initArticle() {
    const article = $("#article");
    if (!article) return; 
    
    on("click", ".back-icon", () => {
        window.history.back();
    });
    
    on("click", ".share-icon", () => {
        shareArticle();
    });

    observeArticleCards();
    handleShowMore("#articles-grid", "#showMoreBtn");
    initCreateModal("#articles-grid");

    setupHeroFAB();
    setupComments();
    setupFABActions();
}

function setupHeroFAB() {
    const heroSection = $("#article .hero-content");
    const fab = $(".fab-container");
    const scrollBtn = $("#scrollBtn");
    const scrollBtnText = scrollBtn?.querySelector("p");
  
    scrollBtn?.addEventListener("click", () => {
      $("#article .write-up").scrollIntoView({ behavior: "smooth" });
    });
  
    scrollBtnText?.classList.add("visible");
    setTimeout(() => scrollBtnText?.classList.remove("visible"), 3500);
  
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.isIntersecting ? fab.classList.remove("visible") : fab.classList.add("visible");
        });
      },
      { threshold: 0.5 }
    );
  
    observer.observe(heroSection);
}
function setupComments () {
    const articleSlug = $("#article").dataset.slug;
    const commentForm = $("#commentForm");
    const commentsList = $(".comments-list");
    const commentCount = $(".comments-count");

    function addCommentToDOM(comment) {
        commentsList.insertAdjacentHTML(
            'afterbegin', 
            `
            <div class="comment-card new-comment" data-comment-id="${comment.id}">
                <div class="comment-content">
                    <div class="comment-avatar">
                        <span class="avatar-initials">${comment.initials}</span>
                    </div>
                    <div class="comment-body">
                        <div class="comment-meta">
                            <span class="comment-author">${comment.author}</span>
                            <span class="comment-time">${comment.time}</span>
                        </div>
                        <p class="comment-text">${comment.content}</p>
                        <button class="like-btn" data-comment-id="${comment.id}">
                            <svg class="like-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M7 10v12"/>
                                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>
                            </svg>
                            <span class="like-count">${comment.likes}</span>
                        </button>
                    </div>
                </div>
            </div>
        `);
        
        const newComment = $(".new-comment");
        setTimeout(() => {
            newComment.classList.remove('new-comment');
        }, 100);
    }
    function updateCommentCount(change) {
        const currentCount = parseInt(commentCount.textContent.match(/\d+/)[0]);
        commentCount.textContent = `(${currentCount + change})`;
    }
    commentForm?.addEventListener("submit", async function (e) {
        e.preventDefault();

        const newComment = await fetchForm(`/article/${articleSlug}/comment`, commentForm);
        addCommentToDOM(newComment);
        updateCommentCount(1);

        commentForm.reset();
    });
    on("click", ".like-btn", async (e, btn) => {
        const id = btn.dataset.commentId;
        const data = await likeArticle(id, true);  
      
        btn.querySelector(".like-count").textContent = data.likes;
        animateLike(btn);
    });
}
function animateLike(btn) {
    if (!btn) return;
    btn.classList.add("liked");
    setTimeout(() => btn.classList.remove("liked"), 600);
}
function setupFABActions() {
    const fabMain = $("#fabMain");
    const fabContainer = $(".fab-container");
  
    fabMain?.addEventListener("click", () => fabContainer.classList.toggle("active"));
  
    document.addEventListener("click", (e) => {
      if (!fabContainer.contains(e.target)) fabContainer.classList.remove("active");
    });
  
    on("click", ".fab-option", (e, el) => {
      handleFabAction(el.dataset.action);
      setTimeout(() => {
          $(".fab-container").classList.remove("active"); 
    }, 1000);
    });
}

async function handleFabAction(action) {
    const articleSlug = $("#article").dataset.slug;

    if (action === "like") {
        const data = await likeArticle(articleSlug);
        console.log(data);
        const btn = $(`.fab-option.like`);
        animateLike(btn);
    }

    if (action === "comment") {
        $("#comments").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (action === "create-post") {
        $("#createModalOverlay").classList.add("active");
    }

    if (action === "share-post") {
        const title = $("#article-title")?.textContent;
        shareArticle(articleSlug, title);
    }
}



  