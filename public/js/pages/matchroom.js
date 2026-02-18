import { observeArticleCards, handleShowMore } from "../utils/articles.js";
import { initCreateModal } from "../utils/modal.js";
import { $, $all, on } from "../utils/dom.js";

export default function initMatchroom() {
    const defaultContent = $(".content-section");
    const articlesContent = $(".article-div-container");

    articlesContent.classList.add("active");

    on("click", ".tab-nav", (e) => {
        const tab = e.target.closest(".tab-btn");
        if (!tab) return;
    
        $all(".tab-btn").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const contentText = defaultContent.querySelector('p');
        const isAnalysis = tab.classList.contains("analysis");
        
        contentText.textContent = `${tab.textContent.trim()} content coming soon...`;
        articlesContent.classList.toggle("active", isAnalysis);
        defaultContent.classList.toggle("active", !isAnalysis);
    });

    handleShowMore("#articles-grid", "#showMoreBtn")
    observeArticleCards();
    initCreateModal("#articles-grid");
}