import AppCore from "./core/appCore.js";
import initAbout from "./pages/about.js";
import initAnalysis from "./pages/analysis.js";
import initArticle from "./pages/article.js";
import initChart from "./pages/chart.js";
import initIndex from "./pages/index.js";
import initMatchroom from "./pages/matchroom.js";

new AppCore();

const page = document.body.dataset.page;
const pages = {
  about: initAbout,
  analysis: initAnalysis,
  article: initArticle,
  chart: initChart,
  index: initIndex,
  matchroom: initMatchroom,
};

pages[page]?.(); 
