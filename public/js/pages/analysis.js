import { handleShowMore, observeArticleCards } from "../utils/articles.js";
import { initCreateModal } from "../utils/modal.js";
import {$, $all } from "../utils/dom.js";

export default function initFanAnalysis() {
    const grid = $("#articles-grid");
    if (!grid) return;
  
    initCreateModal(grid);   
    observeArticleCards();
    handleShowMore(grid, "#showMoreBtn");
    setupDeleteMode(grid); 
}

function setupDeleteMode(grid) {
    const deleteBtn = $("#delete-post");
    const deleteModeBanner = $("#deleteModeBanner");
    const confirmModal = $("#confirmModalOverlay");
  
    let deleteMode = false;
    let selected = new Set();
  
    const reset = () => {
      deleteMode = false;
      selected.clear();
      deleteModeBanner.classList.remove("active");
      $all(".article-card").forEach(card => {
        card.classList.remove("delete-mode", "selected");
      });
    };
  
    deleteBtn?.addEventListener("click", () => {
      deleteMode = true;
      deleteModeBanner.classList.add("active");
      $all(".article-card").forEach(card => card.classList.add("delete-mode"));
    });
  
    $("#cancelDeleteBtn")?.addEventListener("click", reset);
  
    $("#confirmDeleteBtn")?.addEventListener("click", () => {
      if (selected.size === 0) return;
  
      const deleteList = $("#deleteList");
      deleteList.innerHTML = "";
  
      selected.forEach(id => {
        const title = grid.querySelector(`[data-id="${id}"] .article-title`)?.textContent;
        deleteList.insertAdjacentHTML("beforeend", `<div>• ${title}</div>`);
      });
  
      confirmModal.classList.add("active");
    });
  
    $("#cancelConfirm")?.addEventListener("click", () => {
      confirmModal.classList.remove("active");
    });
  
    $("#confirmFinalDelete")?.addEventListener("click", async () => {
      const res = await fetch("/articles/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
  
      if (res.ok) {
        selected.forEach(id => grid.querySelector(`[data-id="${id}"]`)?.remove());
        reset();
        confirmModal.classList.remove("active");
      }
    });
  
    grid.addEventListener("click", (e) => {
        if (!deleteMode) return;
        
        e.preventDefault();
        e.stopPropagation();

        const card = e.target.closest(".article-card");
        if (!card) return;
        
        const id = card.dataset.id;
        
        if (selected.has(id)) {
            selected.delete(id);
            card.classList.remove("selected");
        } else {
            selected.add(id);
            card.classList.add("selected");
        }
        
        $(".delete-mode-info p").textContent =
        selected.size === 1
        ? "1 article selected"
        : `${selected.size} articles selected`;
    });
}
  