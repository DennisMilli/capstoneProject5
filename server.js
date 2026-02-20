import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT; 
const { Pool } = pg;
const db = new Pool(
  process.env.DB_URL
  ? {
    connectionString: process.env.DB_URL, 
    ssl: { rejectUnauthorized: false }
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    }
);
const footballAPI = axios.create({
  baseURL: "https://api.football-data.org/v4",
  timeout: 10000,
  headers: {
    "X-Auth-Token": process.env.API_KEY
  }
});
const app = express();

let currentMatchday = 25;
let teamCache = null;
let standingsCache = null;
let standingsTimestamp = 0;
let matchCache = new Map();
let goalChartCache = null;
let scorersTimestamp = 0;

function getTimeAgo(dateString) {
    const pastDate = new Date(dateString);
    const now = new Date();
    const diffInMs = now - pastDate;
    
    if (diffInMs < 0) return 'Just now';
    if (isNaN(diffInMs)) return 'Invalid date';
    
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    if (diffInWeeks < 4) return `${diffInWeeks} wk${diffInWeeks === 1 ? '' : 's'}`;
    
    // For longer periods, use months and years
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);
    
    if (diffInMonths < 12) return `${diffInMonths} mo${diffInMonths === 1 ? '' : 's'}`;
    return `${diffInYears} yr${diffInYears === 1 ? '' : 's'}`;
}
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "") // remove special chars
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

}
function setMatches(matches) {
    matchCache.clear();
    matches.forEach(m => matchCache.set(m.id, m));
}
function getMatchById(id) {
  return matchCache.get(id);
}
function mapScorers(scorers) {
    return scorers.map((s, index) => ({
      playerId: s.player.id,
      position: index + 1,
      player: s.player.name,
      team: s.team.name,
      trend: "same",
      teamCrest: s.team.crest,
      matches: s.playedMatches,
      goals: s.goals,
      assists: s.assists,
      penalties: s.penalties
    }));
}

async function fetchWithRetry(url, maxRetries = 3, timeout = 30000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`Attempt ${i + 1}/${maxRetries}...`);
        const res = await footballAPI.get(url, { timeout });
        return res.data;
      } catch (error) {
        if (error.code === 'ECONNABORTED' && i < maxRetries - 1) {
          console.log(`Timeout, retrying in ${(i + 1) * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
          continue;
        }
        throw error;
      }
    }
}
async function getCurrentMatchday() {
    try {
        const data = await fetchWithRetry('/competitions/PL');
        return data.currentSeason.currentMatchday;
    } catch (error) {
        console.error("All retries failed, using fallback matchday 25", error);
        return 25; // Fallback
    }
}
async function initMatchday() {
    try {
      currentMatchday = await getCurrentMatchday();
      console.log("✅ Current matchday:", currentMatchday);
    } catch {
      console.log("⚠️ Using fallback matchday");
    }
}
async function loadTeamCache() {
  if (teamCache) return teamCache;

  const res = await footballAPI.get("/competitions/PL/teams");

  teamCache = res.data.teams.reduce((acc, team) => {
    acc[team.id] = {
      name: team.name,
      shortName: team.shortName,
      crest: team.crest,
      venue: team.venue
    };
    return acc;
  }, {});

  return teamCache;
}
async function getStandings() {
    if (standingsCache && Date.now() - standingsTimestamp < 60 * 60 * 1000) {
      return standingsCache;
    }
  
    const res = await footballAPI.get("/competitions/PL/standings");
    standingsCache = res.data;
    standingsTimestamp = Date.now();
    return standingsCache;
}
async function getGoalChart() {
    if (goalChartCache && Date.now() - scorersTimestamp < 60 * 60 * 1000) {
      return goalChartCache;
    }
  
    const data = await fetchWithRetry(
      `/competitions/PL/scorers`
    );
  
    goalChartCache = data;
    scorersTimestamp = Date.now();
  
    return goalChartCache;
  }
async function bootstrap() {
    await initMatchday();
    await loadTeamCache();
    await getGoalChart();
}  

app.use(async (req, res, next) => {
    try {
        const [teamLookup, standingsData] = await Promise.all([
            loadTeamCache(),
            getStandings()
        ]);

        const teamsList = standingsData.standings[0].table.map(t => ({
            id: t.team.id,
            name: t.team.name,
            crest: teamLookup[t.team.id]?.crest || '/img/default-crest.png'
        }));

        res.locals.standings = standingsData;
        res.locals.teamLookup = teamLookup;
        res.locals.teams = teamsList;
        res.locals.league = standingsData.competition;
        
        next(); 
    } catch (error) {
        console.error("Global Middleware Error:", error.message);
        res.locals.teams = [];
        res.locals.league = {};
        next();
    }
});
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(express.json());
bootstrap();
db.connect()
  .then(() => console.log("✅ DB connected"))
  .catch(err => {
    console.error("❌ DB connection failed", err);
    process.exit(1);
  });

app.get("/", async (req, res) => {
  try {
    const matchday = req.query.matchday
        ? parseInt(req.query.matchday) 
        : currentMatchday
    const matchesRes = await (footballAPI.get(`/competitions/PL/matches?matchday=${matchday}`));
    const teams = res.locals.teamLookup;
    const standingsData = res.locals.standings;
    const matches = matchesRes.data.matches.map(m => ({
        id: m.id,
        home: m.homeTeam.name,
        away: m.awayTeam.name,
        homeFlag: teams[m.homeTeam.id]?.crest ?? null,
        awayFlag: teams[m.awayTeam.id]?.crest ?? null,
        venue: teams[m.homeTeam.id]?.venue ?? "Unknown",
        scoreHome: m.score.fullTime.home,
        scoreAway: m.score.fullTime.away,
        status: m.status,
        date: new Date(m.utcDate).toLocaleDateString()
    }));
    const standings = standingsData.standings[0].table.map(t => ({
        team: t.team.name,
        flag: teams[t.team.id]?.crest,
        played: t.playedGames,
        wins: t.won,
        losses: t.lost,
        gf: t.goalsFor,
        ga: t.goalsAgainst,
        points: t.points
    }));
    const initialArticles = await db.query(
      `
      SELECT id, slug, image, title, summary, created_at, category
      FROM articles 
      ORDER BY likes DESC 
      LIMIT $1 OFFSET $2
      `,
      [6, 0]
    );

    setMatches(matches);
    res.render("index.ejs", { 
        pageName: "index",
        matches,
        matchday, 
        standings,
        leagueName: matchesRes.data.competition.name, 
        leagueImage: matchesRes.data.competition.emblem,
        articles: initialArticles.rows
    });
  } catch (err) {
      console.error(err);
      console.error("❌ Home route error:", err);
      res.status(500).send("Server error");
  }
});
app.get('/goal-chart', async (req, res) => {
    try {
        const statsType = req.query.type || 'goals'; 
        const goalChartRes = await getGoalChart();
        const mapped = mapScorers(goalChartRes.scorers);
        const leaders = [...mapped]
            .sort((a, b) => b[statsType] - a[statsType]);
    
        res.render('chart.ejs', {
            pageName: "chart",
            statsType,
            leaders,
            leagueName: goalChartRes.competition.name,
            leagueImage: goalChartRes.competition.emblem
        });
  
    } catch (err) {
        console.error("❌ Goal chart error:", err);
        res.status(500).send("Failed to load goal chart");
    }
});  
app.get("/fan-analysis", async (req, res) => {
  try {
  const result = await db.query(
    `SELECT id, slug, image, title, summary, created_at, category
    FROM articles ORDER BY likes DESC
    `);
  console.log("Sending " + result.rows.length + " articles");
  res.render("analysis.ejs", { 
      pageName: "analysis",
      articles: result.rows });
  } catch (err) {
    console.error("Error fetching analysis articles:", err);
    res.status(500).send("Internal Server Error");
  }
})
app.get("/load-more-articles", async (req, res) => {
  const start = parseInt(req.query.start) || 0;
  const limit = parseInt(req.query.limit) || 4;
  
  try {
  const requestedArticles = await db.query(
      `SELECT id, slug, image, title, summary, created_at, category
      FROM articles
      ORDER BY likes DESC 
      LIMIT $1 OFFSET $2`, 
      [limit, start] 
    );
    console.log(`📊 Sending ${requestedArticles.rows.length} articles`);
    res.json(requestedArticles.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});
app.get("/match/:id", async (req, res) => {
    const match = getMatchById(parseInt(req.params.id));

    if (!match) {
        console.log("Match not found in cache");
        return res.redirect("/");
    }

    const home = match.home.toLowerCase();
    const away = match.away.toLowerCase();

    try {
      const matchArticles = await db.query(
        `SELECT * FROM articles 
        WHERE related_teams::text ILIKE $1 
        OR related_teams::text ILIKE $2
        ORDER BY likes DESC`,
        [`%${home}%`, `%${away}%`]
      );

      console.log(`📊 Found ${matchArticles.rows.length} related articles for ${home} vs ${away}`);  
      
      res.render("matchroom.ejs", { 
        pageName: "matchroom",
        match,
        articles: matchArticles.rows
      });
    } catch (err) {
      console.log(err);
    }
});
app.get("/article/:slug", async (req, res) => {
  try {  
    const articleResult = await db.query("SELECT * FROM articles WHERE slug = $1", [req.params.slug]);
    const foundArticle = articleResult.rows[0]
    
    if (!foundArticle) return res.status(404).render("404");
    const initialArticles = await db.query(
      `
      SELECT id, slug, image, title, summary, created_at, category
      FROM articles 
      ORDER BY likes DESC 
      LIMIT $1 OFFSET $2
      `,
      [4, 0]
    );

    const articleComments = await db.query(
      `SELECT id, author, content, likes, created_at
      FROM comments
      WHERE article_id = $1
      ORDER BY likes DESC
      `,
      [foundArticle.id]
    );

    const comments = articleComments.rows.map(c => ({
      id: c.id,
      author: c.author,
      content: c.content,
      likes: c.likes,
      initials: (c.author || "An").substring(0, 2).toUpperCase(),
      time: getTimeAgo(c.created_at)
    }));
    console.log(foundArticle.title);
    res.render("article.ejs", { 
      pageName: "article",
      article: foundArticle,
      articles: initialArticles.rows,
      comments
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading article");
  }
});
app.get('/about', (req, res) => {
    res.render('about.ejs', {
        pageName: "about"
    });
});

app.post('/articles', async (req, res) => {
  const result = await db.query(
    `
    INSERT INTO articles
    (title, slug, summary, content, image, category, related_teams, related_competition, author)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
    `,
    [
      req.body.title,
      generateSlug(req.body.title),
      req.body.summary,
      req.body.content,
      req.body.image,
      req.body.category,
      JSON.parse(req.body.relatedTeams),
      req.body.relatedCompetitions,
      req.body.author
    ]
  );
  
  res.json(result.rows[0]);
});
app.post("/article/:slug/like", async (req, res) => {
  try {
    const result = await db.query(
      `
      UPDATE articles
      SET likes = likes + 1
      WHERE slug = $1
      RETURNING likes
      `,
      [req.params.slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "article not found" });
    }

    res.json({ likes: result.rows[0].likes });

  } catch (err) {
    console.error("❌ Like article error:", err);
    res.status(500).json({ error: "Failed to like article" });
  }
});
app.post("/article/:slug/comment", async (req, res) => {
  const { author, content } = req.body;

  try {
    const articleRes = await db.query("SELECT id FROM articles WHERE slug = $1", [req.params.slug]);
    const articleId = articleRes.rows[0].id;
    const newCommentRes = await db.query(
        `INSERT INTO comments (article_id, author, content) 
         VALUES ($1, $2, $3) 
         RETURNING id, author, content, likes, created_at`, 
        [articleId, author || "Anonymous", content]
    );
    const newComment = newCommentRes.rows[0];

    res.json({
        ...newComment,
        initials: (newComment.author || "An").substring(0, 2).toUpperCase(),
        time: getTimeAgo(newComment.created_at)
    });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to post comment" });
  }
});
app.post("/comment/:id/like", async (req, res) => {
  try {
    const result = await db.query(
      `
      UPDATE comments
      SET likes = likes + 1
      WHERE id = $1
      RETURNING likes
      `,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "comment not found" });
    }

    res.json({ likes: result.rows[0].likes });
  } catch (err) {
    console.error("❌ Like comment error:", err);
    res.status(500).json({ error: "Failed to like comment" });
  }
});

app.delete("/articles/delete", async (req, res) => {
  try {
    const ids = req.body.ids.map(Number);

    if (!ids.length) {
      return res.status(400).json({ error: "No ids provided" });
    }

    await db.query(
      `
      DELETE FROM articles
      WHERE id = ANY($1::int[])
      `,
      [ids]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("❌ Delete articles error:", err);
    res.status(500).json({ error: "Failed to delete articles" });
  }
});

app.listen(port, () => {
    console.log(`KickOffCorner server running on port ${port}`);
});