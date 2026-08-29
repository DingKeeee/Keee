// Replace the placeholder fields in this array when the six final profiles arrive.
const members = [
  {
    id: "member-01",
    number: "01",
    name: "陈佳鑫",
    initial: "一",
    roleLabel: "社会工作",
    tags: ["Jazz / 羽毛球", "电影 / 旅游"],
    accent: "#ef6a5b",
    photo: "assets/members/member-01-card-cutout-v1.png?v=20260808-prod2",
    detailPhoto: "assets/members/member-01-detail-cutout-v1.png?v=20260808-prod2",
    intro: {
      name: "陈佳鑫",
      hometown: "江西上饶",
      school: "南京理工大学（硕士）",
      major: "社会工作",
      hobbies: ["Jazz、羽毛球", "看电影、旅游", "五子棋"],
      keywords: [],
      message: ""
    }
  },
  {
    id: "member-02",
    number: "02",
    name: "陈紫涵",
    initial: "二",
    roleLabel: "数据科学",
    tags: ["数据分析", "AI / LLM"],
    accent: "#7f9ee8",
    photo: "assets/members/member-02-cutout-v2.png?v=20260808-prod2",
    intro: {
      name: "陈紫涵",
      hometown: "江西赣州",
      school: "莫纳什大学（硕士）",
      major: "数据科学",
      hobbies: [
        "热爱数据分析，关注数据规律，乐于通过 SQL、Python、R 进行分析与可视化。",
        "喜欢研究互联网产品，关注用户体验及数据驱动的产品优化。",
        "持续学习 AI 与大语言模型，关注 Agent、Benchmark 等方向发展。"
      ],
      keywords: [],
      message: ""
    }
  },
  {
    id: "member-03",
    number: "03",
    name: "刘坚锋",
    initial: "三",
    roleLabel: "金融",
    tags: ["钓鱼", "跑步", "篮球"],
    accent: "#63c7b0",
    photo: "assets/members/member-03-cutout-v1.png?v=20260808-prod2",
    intro: {
      name: "刘坚锋",
      hometown: "江西南昌",
      school: "华东交通大学（硕士）",
      major: "金融",
      hobbies: ["钓鱼", "跑步", "篮球"],
      keywords: ["稳重踏实", "善于沟通", "责任心强"],
      message: "很荣幸和大家组队，主动配合团队协作，一起高效完成目标。"
    }
  },
  {
    id: "member-04",
    number: "04",
    name: "黄嘉伟",
    initial: "四",
    roleLabel: "数据分析与人工智能",
    tags: ["骑行", "英雄联盟"],
    accent: "#e2b95c",
    photo: "assets/members/member-04-cutout-v1.png?v=20260808-prod2",
    intro: {
      name: "黄嘉伟",
      hometown: "深圳",
      school: "香港浸会大学（硕士）",
      major: "数据分析与人工智能",
      hobbies: ["骑行", "英雄联盟"],
      keywords: ["逻辑清晰", "执行力强", "学习能力强"],
      message: "保持好奇，持续学习，希望把AI技术真正应用到实际业务场景中。"
    }
  },
  {
    id: "member-05",
    number: "05",
    name: "刘锐",
    initial: "五",
    roleLabel: "大数据技术与工程",
    tags: ["RAG / LangChain", "爬山 / 健身"],
    accent: "#d481ad",
    photo: "assets/members/member-05-cutout-v1.png?v=20260808-prod2",
    intro: {
      name: "刘锐",
      hometown: "广东佛山",
      school: "华南师范大学（硕士）",
      major: "大数据技术与工程",
      hobbies: [
        "研究图神经网络与跨域推荐系统，关注图学习的实际应用。",
        "熟悉 RAG、LangChain，喜欢搭建 AI 应用原型。",
        "参与数学建模竞赛，也喜欢爬山和健身。"
      ],
      keywords: ["外向踏实", "沟通协作", "主动钻研"],
      message: "从数学建模到大模型应用，我喜欢把数据变成答案，也期待和大家一起把想法做成真正有用的作品。"
    }
  },
  {
    id: "member-06",
    number: "06",
    name: "王尧",
    initial: "六",
    roleLabel: "计算机科学与技术",
    tags: ["AI / 前后端", "项目 / 算法"],
    accent: "#a493e8",
    photo: "assets/members/member-06-cutout-v3.png?v=20260808-prod2",
    intro: {
      name: "王尧",
      hometown: "河北沧州",
      school: "河北科技学院",
      major: "计算机科学与技术",
      hobbies: [
        "喜欢钻研 AI 与前后端开发，平时写项目、刷算法题。",
        "关注技术与跨境行业资讯。",
        "闲时通过看书、游戏放松。"
      ],
      keywords: ["i中e", "e中i", "温柔"],
      message: "希望可以在未来一起共创完美的项目。"
    }
  }
];

let activeMember = null;
let isAnimating = false;
let lastFocusedCard = null;
let modalElements = {};

function initMemberCards() {
  modalElements = {
    overlay: document.getElementById("projectModal"),
    backdrop: document.getElementById("projectModalBackdrop"),
    card: document.getElementById("projectModalCard"),
    closeBtn: document.getElementById("projectModalClose"),
    closeTextBtn: document.getElementById("projectModalCloseText"),
    media: document.getElementById("projectModalMedia"),
    member: document.getElementById("projectModalMember"),
    status: document.getElementById("projectModalStatus"),
    board: document.getElementById("projectModalBoard"),
    name: document.getElementById("projectModalName"),
    hometown: document.getElementById("projectModalHometown"),
    school: document.getElementById("projectModalSchool"),
    major: document.getElementById("projectModalMajor"),
    hobbies: document.getElementById("projectModalHobbies"),
    keywords: document.getElementById("projectModalKeywords"),
    message: document.getElementById("projectModalMessage")
  };

  if (!modalElements.overlay || !modalElements.card) return;
  if (modalElements.overlay.parentElement !== document.body) document.body.appendChild(modalElements.overlay);

  renderMemberCards();
  bindMemberCardEvents();
  bindMemberModalEvents();
}

function renderMemberCards() {
  const grid = document.querySelector(".project-cards-grid");
  if (!grid) return;

  grid.innerHTML = members.map((member) => `
    <article class="project-card member-card${member.photo ? " has-photo" : ""}" data-member-id="${member.id}" style="--member-accent:${member.accent}">
      <div class="project-image-wrap member-card-portrait">
        <span class="member-card-index">MEMBER ${member.number}</span>
        ${member.photo
          ? `<img class="project-card-image" src="${member.photo}" alt="${member.name}的照片">`
          : `<strong>${member.number}</strong>`}
        <small>${member.photo ? "PIXEL PROFILE" : "AVATAR SLOT"}</small>
      </div>
      <div class="project-card-info">
        <h3 class="project-card-title">${member.name}</h3>
        <p class="project-card-description">${member.roleLabel}</p>
        <div class="project-tags">${member.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
      </div>
    </article>
  `).join("");
}

function bindMemberCardEvents() {
  document.querySelectorAll(".member-card").forEach((card) => {
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-haspopup", "dialog");
    card.addEventListener("click", openMemberFromCard);
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openMemberFromCard(event);
    });
  });
}

function bindMemberModalEvents() {
  modalElements.backdrop?.addEventListener("click", closeMemberModal);
  modalElements.closeBtn?.addEventListener("click", closeMemberModal);
  modalElements.closeTextBtn?.addEventListener("click", closeMemberModal);
  modalElements.card.addEventListener("click", (event) => event.stopPropagation());
  modalElements.card.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  modalElements.card.addEventListener("touchstart", (event) => event.stopPropagation(), { passive: true });
  modalElements.card.addEventListener("touchend", (event) => event.stopPropagation(), { passive: true });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeMember) closeMemberModal();
  });
}

function openMemberFromCard(event) {
  if (isAnimating || activeMember) return;
  const member = members.find((item) => item.id === event.currentTarget.dataset.memberId);
  if (!member) return;
  lastFocusedCard = event.currentTarget;
  openMemberModal(member);
}

function openMemberModal(member) {
  isAnimating = true;
  activeMember = member;
  renderMember(member);

  document.body.classList.add("project-detail-open");
  modalElements.overlay.style.display = "grid";
  modalElements.overlay.setAttribute("aria-hidden", "false");
  modalElements.card.scrollTop = 0;

  requestAnimationFrame(() => {
    modalElements.overlay.classList.add("is-open");
    modalElements.card.focus({ preventScroll: true });
  });
  setTimeout(() => { isAnimating = false; }, 360);
}

function closeMemberModal() {
  if (isAnimating || !activeMember) return;
  isAnimating = true;
  modalElements.overlay.classList.remove("is-open");
  modalElements.overlay.classList.add("is-closing");

  setTimeout(() => {
    modalElements.overlay.classList.remove("is-closing");
    modalElements.overlay.style.display = "none";
    modalElements.overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("project-detail-open");
    activeMember = null;
    isAnimating = false;
    lastFocusedCard?.focus({ preventScroll: true });
  }, 280);
}

function forceCloseMemberModal() {
  modalElements.overlay?.classList.remove("is-open", "is-closing");
  if (modalElements.overlay) {
    modalElements.overlay.style.display = "none";
    modalElements.overlay.setAttribute("aria-hidden", "true");
  }
  document.body.classList.remove("project-detail-open");
  activeMember = null;
  isAnimating = false;
}

function renderMember(member) {
  modalElements.card.style.setProperty("--member-accent", member.accent);
  modalElements.member.textContent = `GROUP 06 / MEMBER ${member.number}`;
  modalElements.status.textContent = `INTRO TEMPLATE / MEMBER ${member.number}`;
  renderMemberIntro(member.intro);
  renderMemberMedia(member);
}

function renderMemberIntro(intro) {
  const profile = intro || {};
  const hobbies = profile.hobbies || [];
  modalElements.board?.classList.toggle("has-member-content", Boolean(intro));
  modalElements.board?.classList.toggle("has-long-hobbies", hobbies.join("").length > 48);
  modalElements.name.textContent = profile.name || "";
  modalElements.hometown.textContent = profile.hometown || "";
  modalElements.school.textContent = profile.school || "";
  modalElements.major.textContent = profile.major || "";
  modalElements.message.textContent = profile.message || "";
  renderIntroSlots(modalElements.hobbies, hobbies);
  renderIntroSlots(modalElements.keywords, profile.keywords);
}

function renderIntroSlots(container, values = []) {
  container.querySelectorAll("span").forEach((slot, index) => {
    slot.textContent = values[index] || "";
  });
}

function renderMemberMedia(member) {
  const modalPhoto = member.detailPhoto || member.photo;
  modalElements.media.textContent = "";
  modalElements.media.classList.toggle("has-member-photo", Boolean(modalPhoto));
  modalElements.media.dataset.memberNumber = member.number;
  modalElements.media.style.setProperty("--member-accent", member.accent);
  if (modalPhoto) {
    const image = document.createElement("img");
    image.className = "member-modal-photo";
    image.src = modalPhoto;
    image.alt = `${member.name}的照片`;
    modalElements.media.appendChild(image);
    return;
  }

  const placeholder = document.createElement("div");
  placeholder.className = "member-modal-placeholder";
  placeholder.innerHTML = `<span>MEMBER ${member.number}</span><strong>${member.number}</strong><small>PIXEL PORTRAIT / PENDING</small>`;
  modalElements.media.appendChild(placeholder);
}

window.addEventListener("scene:change", () => {
  if (activeMember) forceCloseMemberModal();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMemberCards);
} else {
  initMemberCards();
}
