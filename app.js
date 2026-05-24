// App Javascript for Sercan Özkan Interactive Portfolio

// ----------------------------------------------------
// 1. STARFIELD / PARTICLES CANVAS BACKGROUND
// ----------------------------------------------------
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let animationFrameId = null;
let canvasActive = true;
const maxParticles = 65;

// Resize canvas dynamically
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2.5 + 0.5;
    this.speedX = Math.random() * 0.4 - 0.2;
    this.speedY = Math.random() * 0.4 - 0.2;
    this.color = Math.random() > 0.5 ? 'rgba(0, 229, 255, 0.4)' : 'rgba(124, 58, 237, 0.3)';
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
      this.reset();
    }
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < maxParticles; i++) {
    particles.push(new Particle());
  }
}
initParticles();

function animateParticles() {
  if (!canvasActive) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw subtle starfield background color overlay
  ctx.fillStyle = 'rgba(2, 6, 23, 0.15)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Update and draw particles
  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw();

    // Draw lines connecting close particles
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 110) {
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.12 * (1 - dist / 110)})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }
  animationFrameId = requestAnimationFrame(animateParticles);
}
animateParticles();


// ----------------------------------------------------
// 2. HERO TYPING ANIMATION
// ----------------------------------------------------
const typingWords = [
  "Computer Engineering Student",
  "AI Tools Developer",
  "Backend & Systems Enthusiast",
  "Clean Code & Smart UI Designer"
];
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typingTextElement = document.getElementById('hero-typing-text');

function type() {
  const currentWord = typingWords[wordIndex];
  if (isDeleting) {
    charIndex--;
  } else {
    charIndex++;
  }

  typingTextElement.textContent = currentWord.substring(0, charIndex);

  let typeSpeed = isDeleting ? 40 : 80;

  if (!isDeleting && charIndex === currentWord.length) {
    typeSpeed = 1500; // Pause at end of word
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    wordIndex = (wordIndex + 1) % typingWords.length;
    typeSpeed = 400; // Pause before typing next word
  }

  setTimeout(type, typeSpeed);
}
setTimeout(type, 1000);


// ----------------------------------------------------
// 3. INTERACTIVE CLI TERMINAL SIMULATION
// ----------------------------------------------------
const termInput = document.getElementById('terminal-cmd-input');
const termScreen = document.getElementById('terminal-screen');
const termInputRow = document.getElementById('terminal-input-row');
const termHelpers = document.querySelectorAll('.term-helper');

// List of commands & outcomes
const commands = {
  'help': `Available Commands:
  <span class="yaml-key">./profile --status</span>   Show Sercan's developer state
  <span class="yaml-key">./profile --projects</span> Show JSON list of active projects
  <span class="yaml-key">skills</span>               Print technical proficiency stats
  <span class="yaml-key">about</span>                Print biography summary
  <span class="yaml-key">matrix</span>               Initialize green digital rain grid
  <span class="yaml-key">clear</span>                Clear the terminal screen`,
  
  './profile --status': `System Status Report:
  [Name]         Sercan Özkan
  [Academic]     Computer Engineering Student
  [Role]         Backend Developer & AI Integrator
  [Availability] Open for collaboration on AI/Backend systems
  [Status]       Building modern production-grade portfolio items`,

  './profile --projects': `[
  {
    "name": "CV Analyzer",
    "description": "ATS scoring, gap analysis, CV optimization using AI metrics.",
    "tech": ["Python", "Embeddings", "NLP"]
  },
  {
    "name": "Neon Space Duel",
    "description": "Spaceship battle arcade using Canvas physics & dynamic AI.",
    "tech": ["HTML5 Canvas", "JavaScript", "Animations"]
  },
  {
    "name": "FoodApp",
    "description": "Structured food catalog ordering system with robust DB endpoints.",
    "tech": ["NodeJS", "Express", "REST API", "Database"]
  }
]`,

  'skills': `Capability Analytics:
  [AI Prompt Engineering]  ======================= 90%
  [Backend Web Logic]      ==================== 85%
  [Database Architecture]  ================== 78%
  [Desktop System Apps]    ================= 70%`,

  'about': `About Sercan:
  A coder focused on constructing digital tools that matter.
  Loves high-performance systems, clean design formatting, and integrating
  intelligent models to augment ordinary software functions.`,

  'clear': 'CLEAR_SCREEN'
};

// Handle command submission
function submitCommand(cmd) {
  cmd = cmd.trim();
  if (cmd === '') return;

  // Add line representing what user typed
  const userRow = document.createElement('div');
  userRow.className = 'terminal-line';
  userRow.innerHTML = `<span class="prompt-prefix">sercan@github</span>:<span class="prompt-path">~</span>$ <span class="prompt-command">${escapeHtml(cmd)}</span>`;
  termScreen.insertBefore(userRow, termInputRow);

  // Process response
  const outputRow = document.createElement('div');
  outputRow.className = 'terminal-line terminal-output';

  const normalizedCmd = cmd.toLowerCase();
  
  if (normalizedCmd === 'clear') {
    // Clear all except input row
    const lines = termScreen.querySelectorAll('.terminal-line');
    lines.forEach(l => l.remove());
  } else if (normalizedCmd === 'matrix') {
    startMatrixRain(outputRow);
    termScreen.insertBefore(outputRow, termInputRow);
  } else if (commands[cmd]) {
    outputRow.innerHTML = commands[cmd];
    termScreen.insertBefore(outputRow, termInputRow);
  } else if (commands[normalizedCmd]) {
    outputRow.innerHTML = commands[normalizedCmd];
    termScreen.insertBefore(outputRow, termInputRow);
  } else {
    outputRow.innerHTML = `bash: command not found: ${escapeHtml(cmd)}. Type <span style="color: var(--primary);">help</span> to view documentation.`;
    termScreen.insertBefore(outputRow, termInputRow);
  }

  // Scroll to bottom
  termScreen.scrollTop = termScreen.scrollHeight;
}

// Matrix Digital Rain effect inside the terminal line
function startMatrixRain(containerElement) {
  containerElement.style.color = '#22c55e';
  containerElement.style.fontFamily = 'monospace';
  containerElement.innerHTML = 'Matrix Stream connection established...<br>';
  
  let iterations = 0;
  const intervalId = setInterval(() => {
    let lineStr = '';
    for (let i = 0; i < 40; i++) {
      lineStr += Math.random() > 0.5 ? Math.floor(Math.random() * 10) : String.fromCharCode(33 + Math.floor(Math.random() * 93));
    }
    containerElement.innerHTML += lineStr + '<br>';
    termScreen.scrollTop = termScreen.scrollHeight;
    
    iterations++;
    if (iterations > 12) {
      clearInterval(intervalId);
      containerElement.innerHTML += '<span style="color: var(--text-muted)">Matrix stream closed.</span>';
      termScreen.scrollTop = termScreen.scrollHeight;
    }
  }, 150);
}

// Escape HTML helper
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Event Listeners for Terminal
termInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    submitCommand(termInput.value);
    termInput.value = '';
  }
});

// Focus input when terminal block is clicked
document.getElementById('terminal-widget').addEventListener('click', () => {
  termInput.focus();
});

// Terminal helpers buttons
termHelpers.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation(); // Avoid triggering container focus handlers
    const cmd = btn.getAttribute('data-cmd');
    submitCommand(cmd);
  });
});


// ----------------------------------------------------
// 4. CV ANALYZER INTERACTIVE ATS SIMULATOR
// ----------------------------------------------------
const cvResumePreset = document.getElementById('cv-resume-preset');
const cvJobPreset = document.getElementById('cv-job-preset');
const cvTextarea = document.getElementById('cv-textarea-input');
const cvScanBtn = document.getElementById('cv-scan-btn');
const cvResultsPanel = document.getElementById('cv-results-panel');

const resumeContentPresets = {
  custom: "",
  student: `Sercan Özkan - Computer Engineering Student
CONTACT: github.com/SercanOzkan55
SUMMARY: Energetic engineering student building robust software tools. Combines prompt engineering, database architecture, and backend automation to create rich user experiences.
SKILLS: Python, JavaScript, Express, HTML Canvas, Git, SQL, Prompts Engineering, Custom APIs.
PROJECTS:
- CV Analyzer: Analyzes resume match and displays ATS score with targeted NLP reviews.
- Neon Space Duel: Arcade browser experience featuring canvas render grids.
- FoodApp: API integrations and clean databases state controls.`,
  
  basic_dev: `Jane Doe - Junior Web Developer
SUMMARY: Entry level developer focused on basic HTML, CSS, and basic JavaScript.
SKILLS: HTML5, CSS3, ES5 JS, jQuery, WordPress theme building.
EDUCATION: Web design bootcamp certificate.
PROJECTS: Single page layout designs, contact validation forms.`,
  
  marketing: `John Smith - Sales Specialist
SUMMARY: Outgoing customer relationship manager. Driven to generate leads and configure marketing funnels.
SKILLS: Salesforce CRM, Negotiation, Presentation, Adword targeting, Excel spreadsheets.
EXPERIENCE: 2 years managing local ad campaigns and driving lead volume.`
};

// Prefill text based on preset selection
cvResumePreset.addEventListener('change', () => {
  cvTextarea.value = resumeContentPresets[cvResumePreset.value];
});
// Set default
cvTextarea.value = resumeContentPresets['student'];

// Scan button action
cvScanBtn.addEventListener('click', () => {
  // Clear layout, show spinner status
  cvResultsPanel.innerHTML = `
    <div class="cv-analyzer-status">
      <div class="cv-status-spinner"></div>
      <p id="cv-loading-step" style="color: var(--primary); font-family: var(--font-mono); font-size:0.85rem; text-shadow: var(--neon-shadow);">Initializing parsing matrix...</p>
    </div>
  `;

  // Status transitions
  const steps = [
    "Extracting details and indexing skills...",
    "Comparing keywords against target job description...",
    "Computing vector semantic matching matrix...",
    "Formatting insights breakdown report..."
  ];

  let currentStep = 0;
  const stepInterval = setInterval(() => {
    const loadingText = document.getElementById('cv-loading-step');
    if (loadingText && steps[currentStep]) {
      loadingText.textContent = steps[currentStep];
      currentStep++;
    } else {
      clearInterval(stepInterval);
      renderScanResults();
    }
  }, 750);
});

// Core logic evaluating score and populating graphs
function renderScanResults() {
  const cvType = cvResumePreset.value;
  const jobType = cvJobPreset.value;
  const userText = cvTextarea.value.trim();

  let score = 0;
  let summary = "";
  let strengths = [];
  let gaps = [];

  // 1. Calculate Score & dynamic feedback based on combination
  if (userText === "") {
    score = 10;
    summary = "No resume content detected. Unable to perform semantic evaluation.";
    strengths = ["Text parser successfully initialized."];
    gaps = ["Paste credentials, skills, or portfolio titles to perform matching."];
  } else if (cvType === 'student' && jobType === 'ai_engineer') {
    score = 88;
    summary = "Outstanding fit! Sercan's resume contains excellent keyword overlaps with backend technologies, custom API structures, and explicit AI/Prompt engineering skill sets matching this target profile.";
    strengths = [
      "Explicitly mentions AI components and Prompt Engineering.",
      "Projects align (CV Analyzer sandbox, Neon Space Duel).",
      "Good mix of systems/backend technology markers (Python, SQL)."
    ];
    gaps = [
      "Could highlight cloud deployment pipelines (Docker, AWS) for production readiness.",
      "Add detail about backend framework testing utilities (PyTest or Mocha)."
    ];
  } else if (cvType === 'student' && jobType === 'front_dev') {
    score = 65;
    summary = "Moderate matching. Sercan has strong foundational skills in JS and HTML Canvas, but the job description requires advanced UI framework patterns.";
    strengths = [
      "Strong JavaScript and HTML5 Canvas canvas knowledge.",
      "Excellent frontend visual designs shown in portfolio."
    ];
    gaps = [
      "Missing reactive frameworks (React, Vue, or Angular).",
      "Missing UI styling layers (Tailwind, Sass) in resume description."
    ];
  } else if (cvType === 'student' && jobType === 'sales_executive') {
    score = 22;
    summary = "Critical skill gaps. Technical development experience does not align with the KPIs required for client marketing pipelines and sales funnels.";
    strengths = [
      "High analytic capability indicator."
    ];
    gaps = [
      "Lacks Salesforce or CRM management tools.",
      "No direct marketing operations or budget lead generation experience listed."
    ];
  } else if (cvType === 'basic_dev' && jobType === 'front_dev') {
    score = 80;
    summary = "Good match. Junior Web Developer credentials align reasonably well with standard Frontend requirements.";
    strengths = [
      "Includes core fundamentals (HTML, CSS, JavaScript).",
      "Hands-on web page layout formatting experience."
    ];
    gaps = [
      "Modern setups require ES6+ features and tooling systems.",
      "Need exposure to git branch management flow."
    ];
  } else if (cvType === 'basic_dev' && jobType === 'ai_engineer') {
    score = 42;
    summary = "Below target. Resume indicates web frontend scripting knowledge but lacks python scripting, neural networks, or deep backend API patterns.";
    strengths = [
      "Foundational coding familiarity."
    ];
    gaps = [
      "Missing analytical math/statistics backdrop.",
      "No python libraries (NumPy, PyTorch, Langchain) mentioned.",
      "No system-level endpoints databases mentioned."
    ];
  } else if (cvType === 'marketing' && jobType === 'sales_executive') {
    score = 92;
    summary = "Superb alignment. Experience matches lead generation CRM requirements and digital pipeline operations.";
    strengths = [
      "Explicit Salesforce CRM listing.",
      "Adwords funneling and marketing automation tools included.",
      "Clear indicators of client relationship coordination."
    ];
    gaps = [
      "Highlight data analytics dashboard tools (PowerBI, Tableau) to bolster resume rating."
    ];
  } else {
    // Custom or random calculation based on text matching keywords
    let matchCount = 0;
    const lowerText = userText.toLowerCase();
    const keywords = ['python', 'ai', 'react', 'backend', 'database', 'javascript', 'api', 'git', 'node', 'sql'];
    
    keywords.forEach(kw => {
      if (lowerText.includes(kw)) matchCount++;
    });

    score = 40 + (matchCount * 5) + Math.floor(Math.random() * 10);
    if (score > 98) score = 98;
    
    summary = "Custom evaluation completed. Text parsed against our semantic model.";
    strengths = [
      `Keyword search match: ${matchCount} core technical entities detected.`,
      "Formatting displays logical layout division."
    ];
    gaps = [
      "Consider tailoring your summary section to directly reference specific job listing deliverables.",
      "Incorporate measurable project KPIs (e.g., 'speed boosted by 20%')."
    ];
  }

  // Render report HTML back into container
  cvResultsPanel.innerHTML = `
    <div class="cv-report" id="cv-final-report" style="display: block;">
      <div class="cv-score-gauge">
        <svg class="cv-score-svg">
          <defs>
            <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#7c3aed" />
              <stop offset="100%" stop-color="#00e5ff" />
            </linearGradient>
          </defs>
          <circle class="cv-score-bg" cx="75" cy="75" r="70"></circle>
          <circle class="cv-score-fill" id="cv-score-circle" cx="75" cy="75" r="70" style="stroke-dashoffset: 440;"></circle>
        </svg>
        <div class="cv-score-text">
          <span id="cv-score-val">0</span>%
          <span>ATS Match</span>
        </div>
      </div>

      <div class="cv-breakdown-row">
        <h4>Analysis Details:</h4>
        <div class="cv-insights-box">
          <h5 id="cv-report-title"><i class="fa-solid fa-circle-check"></i> AI Assessment</h5>
          <p id="cv-report-summary" style="margin-bottom: 0.8rem; line-height:1.4;">${summary}</p>
          
          <h5 style="color: var(--primary);"><i class="fa-solid fa-list-check"></i> Strengths Identified:</h5>
          <ul class="cv-insights-list" id="cv-report-strengths">
            ${strengths.map(s => `<li>${s}</li>`).join('')}
          </ul>
          
          <h5 style="margin-top: 0.8rem; color: #f43f5e;"><i class="fa-solid fa-triangle-exclamation"></i> Skills Gap / Recommendations:</h5>
          <ul class="cv-insights-list" id="cv-report-gaps">
            ${gaps.map(g => `<li>${g}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;

  // Trigger svg dash offset animation and counter text
  setTimeout(() => {
    const circle = document.getElementById('cv-score-circle');
    const scoreVal = document.getElementById('cv-score-val');
    
    // Circle length is 2 * PI * r = 2 * 3.14159 * 70 = 439.82 (~440)
    const offset = 440 - (440 * score) / 100;
    circle.style.strokeDashoffset = offset;

    // Count up text
    let currentScore = 0;
    const counter = setInterval(() => {
      if (currentScore >= score) {
        scoreVal.textContent = score;
        clearInterval(counter);
      } else {
        currentScore++;
        scoreVal.textContent = currentScore;
      }
    }, 15);
  }, 100);
}


// ----------------------------------------------------
// 5. PROFILE DYNAMIC CONFIGURATOR (YAML STATE)
// ----------------------------------------------------
const configTheme = document.getElementById('config-theme-select');
const configAiToggle = document.getElementById('config-ai-toggle');
const configParticles = document.getElementById('config-particles-toggle');
const configCollab = document.getElementById('config-collab-toggle');
const yamlPreview = document.getElementById('yaml-preview-box');

const aiBarWrapper = document.querySelector('.skill-bar-wrapper:first-child');
const aiFocusBadge = document.getElementById('badge-focus');

// Update UI styling on Configuration Changes
function updateConfig() {
  const theme = configTheme.value;
  const showAi = configAiToggle.checked;
  const animateBg = configParticles.checked;
  const collab = configCollab.checked;

  // Theme accent change
  if (theme === 'purple') {
    document.documentElement.style.setProperty('--primary', '#c084fc');
    document.documentElement.style.setProperty('--border-glow', 'rgba(192, 132, 252, 0.2)');
    document.documentElement.style.setProperty('--neon-shadow', '0 0 10px rgba(192, 132, 252, 0.4), 0 0 20px rgba(192, 132, 252, 0.2)');
  } else {
    document.documentElement.style.setProperty('--primary', '#00e5ff');
    document.documentElement.style.setProperty('--border-glow', 'rgba(0, 229, 255, 0.2)');
    document.documentElement.style.setProperty('--neon-shadow', '0 0 10px rgba(0, 229, 255, 0.4), 0 0 20px rgba(0, 229, 255, 0.2)');
  }

  // Show/Hide AI features
  if (showAi) {
    aiBarWrapper.style.display = 'block';
    aiFocusBadge.style.opacity = '1';
  } else {
    aiBarWrapper.style.display = 'none';
    aiFocusBadge.style.opacity = '0.3';
  }

  // Toggle background loop
  if (animateBg) {
    if (!canvasActive) {
      canvasActive = true;
      animateParticles();
    }
    canvas.style.opacity = '1';
  } else {
    canvasActive = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    canvas.style.opacity = '0';
  }

  // Collab badge status update
  const statusBadge = document.getElementById('badge-status');
  if (collab) {
    statusBadge.innerHTML = `<i class="fa-solid fa-envelope-open-text"></i> Open for Collab`;
    statusBadge.style.animation = 'pulseGlow 2s infinite ease-in-out';
  } else {
    statusBadge.innerHTML = `<i class="fa-solid fa-code"></i> Status: Building Real Projects`;
    statusBadge.style.animation = 'none';
  }

  // Update YAML visual block
  yamlPreview.innerHTML = `
<span class="yaml-key">config:</span>
  <span class="yaml-key">theme_accent:</span> <span class="yaml-string">"${theme}"</span>
  <span class="yaml-key">visuals:</span>
    <span class="yaml-key">starfield_background:</span> <span class="yaml-val">${animateBg}</span>
    <span class="yaml-key">focus_index_visible:</span> <span class="yaml-val">${showAi}</span>
  <span class="yaml-key">collaboration:</span>
    <span class="yaml-key">open_status:</span> <span class="yaml-val">${collab}</span>
    <span class="yaml-key">channels:</span> <span class="yaml-string">"connection_port_5000"</span>
`;
}

// Config Event listeners
configTheme.addEventListener('change', updateConfig);
configAiToggle.addEventListener('change', updateConfig);
configParticles.addEventListener('change', updateConfig);
configCollab.addEventListener('change', updateConfig);

// Initialize configuration render
updateConfig();


// ----------------------------------------------------
// 6. SCROLL REVEAL & SKILLS PROGRESS ANIMATIONS
// ----------------------------------------------------
const revealElements = document.querySelectorAll('.scroll-reveal');
const skillFills = document.querySelectorAll('.skill-fill');

const observerOptions = {
  root: null,
  threshold: 0.15,
  rootMargin: "0px"
};

const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      
      // If the about section reveals, trigger the skill fills animation
      if (entry.target.id === 'about') {
        setTimeout(() => {
          skillFills.forEach(fill => {
            const width = fill.getAttribute('data-width');
            fill.style.width = width;
          });
        }, 300);
      }
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

revealElements.forEach(el => {
  observer.observe(el);
});
