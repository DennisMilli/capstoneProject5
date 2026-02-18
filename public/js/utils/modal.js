import { $, on, addClass, removeClass, toggleClass } from "./dom.js";
import { fetchForm } from "./fetch.js";
import { createArticleCard, observeArticleCards } from "./articles.js";

export function initCreateModal(gridSelector) {
  const overlay     = $("#createModalOverlay");
  const form        = $("#createArticleForm");
  const imageInput  = $("#image");
  const imagePreview = $("#imagePreview");
  const previewImg   = $("#previewImg");
  const grid = $(gridSelector);
  const textarea = $("#content");

  const teamButtons = document.querySelectorAll(".team-chip");
  const relatedTeamsInput = document.getElementById("relatedTeamsInput");

  let selectedTeams = new Set();

  on("click", "#create-post, .create-post, [data-action='create-post']", () => {
    addClass(overlay, "active");
    initTinyMCE();
  });

  $("#closeCreateModal")?.addEventListener("click", () => {
    removeClass(overlay, "active");
    resetModal();
  })
  
  $("#cancelCreate")?.addEventListener("click", () => {
    removeClass(overlay, "active");
    resetModal();
  });

  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) removeClass(overlay, "active");
  });

  imageInput?.addEventListener("input", (e) => {
    previewImg.src = e.target.value;
    toggleClass(imagePreview, "active"); 
  });

  teamButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.teamId;
    
      btn.classList.toggle("active");
    
      btn.classList.contains("active")
        ? selectedTeams.add(name)
        : selectedTeams.delete(name);

      relatedTeamsInput.value = JSON.stringify([...selectedTeams]);
    });
  });

  $("#submitCreate").addEventListener("click", async (e) => {
    console.log( `seen ${form}`);
    e.preventDefault();
    // eslint-disable-next-line no-undef
    if (tinymce.get("content")) {
        // eslint-disable-next-line no-undef
        tinymce.triggerSave(); // 
    }

    const newArticle = await fetchForm("/articles", form);
    const card = createArticleCard(newArticle);

    grid.insertAdjacentElement("afterbegin", card);
    observeArticleCards(grid);

    removeClass(overlay, "active");
    form.reset();
    removeClass(imagePreview, "active");
  });

  function resetModal() {
    form?.reset();
    imagePreview?.classList.remove("has-image");
    previewImg.src = "";

    // eslint-disable-next-line no-undef
    if (tinymce.get("content")) {
      // eslint-disable-next-line no-undef
      tinymce.get("content").setContent("");
    }

    relatedTeamsInput.value = "";
    teamButtons.forEach(btn => btn.classList.remove("active"));
  }

  function initTinyMCE() {
    if (!textarea) return;
      // eslint-disable-next-line no-undef
      if (tinymce.get("content")) return;
      
        // eslint-disable-next-line no-undef
        tinymce.init({
            selector: "textarea#content",
            plugins: "advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table wordcount",
            toolbar:
            "undo redo | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | removeformat | code",
            height: 500,
            setup(editor) {
                console.log("Tiny initialized", editor.id)
            },
            automatic_uploads: true,
            paste_data_images: true,
            content_style: `
            body { font-family: Manrope, Arial, sans-serif; font-size: 15px; line-height: 1.6; }
            p { margin-bottom: 1em; }
            `
        });
  }
}

