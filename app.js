const hasConfig =
  window.SUPABASE_URL &&
  window.SUPABASE_ANON_KEY &&
  !window.SUPABASE_URL.includes("YOUR_") &&
  !window.SUPABASE_ANON_KEY.includes("YOUR_");

const supabaseClient = hasConfig
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const authForm = document.getElementById("authForm");
const authButton = document.getElementById("authButton");
const toggleAuth = document.getElementById("toggleAuth");
const authNickname = document.getElementById("authNickname");
const authStatus = document.getElementById("authStatus");
const nicknameModal = document.getElementById("nicknameModal");
const nicknameInput = document.getElementById("nicknameInput");
const nicknameStatus = document.getElementById("nicknameStatus");
const currentNickname = document.getElementById("currentNickname");
const welcome = document.getElementById("welcomeName");
const messages = document.getElementById("messages");
const members = document.getElementById("members");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const messageStatus = document.getElementById("messageStatus");
const photoInput = document.getElementById("photoInput");
const emojiButton = document.getElementById("emojiButton");
const emojiPanel = document.getElementById("emojiPanel");

let signUpMode = false;
let profile = null;
let channel = null;

const emojis = ["😀","😂","😍","🥳","😎","😭","😡","👍","👎","❤️","💛","💚","💙","🔥","🎉","🐶","🐕","🐾","✨","🙌","👏","🤣","😊","😅","🤔","😴","🙏","💯","🌟","🍜","🎮","📸"];

emojis.forEach(e => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = e;
  b.addEventListener("click", () => {
    messageInput.value += e;
    messageInput.focus();
  });
  emojiPanel.appendChild(b);
});

emojiButton.addEventListener("click", () => emojiPanel.classList.toggle("hidden"));
document.addEventListener("click", e => {
  if (!emojiPanel.contains(e.target) && e.target !== emojiButton) emojiPanel.classList.add("hidden");
});

function setStatus(el, text = "") { el.textContent = text; }

toggleAuth.addEventListener("click", () => {
  signUpMode = !signUpMode;
  authButton.textContent = signUpMode ? "Create account" : "Sign in";
  authNickname.style.display = signUpMode ? "block" : "none";
  toggleAuth.textContent = signUpMode ? "Already have an account? Sign in" : "Need an account? Sign up";
  setStatus(authStatus);
});

authNickname.style.display = "none";

authForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (!supabaseClient) {
    setStatus(authStatus, "Add your Supabase URL and anon key to config.js first.");
    return;
  }

  setStatus(authStatus, "Working…");
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (signUpMode) {
    const nickname = authNickname.value.trim();
    if (!nickname) return setStatus(authStatus, "Choose a nickname.");
    const { error } = await supabaseClient.auth.signUp({
      email, password,
      options: { data: { nickname } }
    });
    if (error) return setStatus(authStatus, error.message);
    setStatus(authStatus, "Account created. Check your email if confirmation is enabled.");
  } else {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return setStatus(authStatus, error.message);
  }
});

document.getElementById("signOut").addEventListener("click", async () => {
  await supabaseClient?.auth.signOut();
  location.reload();
});

async function loadProfile(user) {
  const { data, error } = await supabaseClient
    .from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (error) throw error;
  profile = data;

  if (!profile?.nickname) {
    nicknameInput.value = user.user_metadata?.nickname || "";
    nicknameModal.classList.remove("hidden");
  } else {
    enterApp();
  }
}

function enterApp() {
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  currentNickname.textContent = profile.nickname;
  welcome.textContent = profile.nickname;
  loadMessages();
  subscribeToChat();
  loadMembers();
}

document.getElementById("saveNickname").addEventListener("click", async () => {
  const nickname = nicknameInput.value.trim();
  if (!nickname) return setStatus(nicknameStatus, "Enter a nickname.");
  if (nickname.length > 30) return setStatus(nicknameStatus, "Nickname is too long.");

  const { data, error } = await supabaseClient
    .from("profiles")
    .upsert({ id: (await supabaseClient.auth.getUser()).data.user.id, nickname }, { onConflict: "id" })
    .select().single();

  if (error) return setStatus(nicknameStatus, error.message);
  profile = data;
  nicknameModal.classList.add("hidden");
  enterApp();
});

document.getElementById("changeNickname").addEventListener("click", () => {
  nicknameInput.value = profile?.nickname || "";
  nicknameStatus.textContent = "";
  nicknameModal.classList.remove("hidden");
});

function linkify(text) {
  const escaped = text.replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  return escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

function renderMessage(m) {
  const wrap = document.createElement("div");
  wrap.className = "message" + (m.user_id === profile.id ? " mine" : "");

  const inner = document.createElement("div");
  inner.className = "bubble-wrap";

  const name = document.createElement("div");
  name.className = "name";
  name.textContent = m.nickname || "Member";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (m.image_url) {
    const img = document.createElement("img");
    img.src = m.image_url;
    img.alt = "Shared photo";
    img.loading = "lazy";
    bubble.appendChild(img);
  }
  if (m.content) {
    const p = document.createElement("div");
    p.innerHTML = linkify(m.content);
    bubble.appendChild(p);
  }

  const time = document.createElement("div");
  time.className = "time";
  time.textContent = new Date(m.created_at).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});

  inner.append(name, bubble, time);
  wrap.appendChild(inner);
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
}

async function loadMessages() {
  messages.innerHTML = "";
  const { data, error } = await supabaseClient
    .from("messages").select("*").order("created_at", { ascending: true }).limit(200);
  if (error) return setStatus(messageStatus, error.message);
  data.forEach(renderMessage);
}

function subscribeToChat() {
  channel = supabaseClient
    .channel("public:messages")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, payload => {
      if (payload.new.user_id !== profile.id) renderMessage(payload.new);
    })
    .subscribe();
}

async function loadMembers() {
  const { data } = await supabaseClient.from("profiles").select("nickname").order("nickname").limit(100);
  members.innerHTML = "";
  (data || []).forEach(p => {
    const el = document.createElement("span");
    el.className = "member";
    el.textContent = "👤 " + p.nickname;
    members.appendChild(el);
  });
}

messageForm.addEventListener("submit", async e => {
  e.preventDefault();
  const content = messageInput.value.trim();
  if (!content) return;

  const { data, error } = await supabaseClient.from("messages").insert({
    user_id: profile.id,
    nickname: profile.nickname,
    content
  }).select().single();

  if (error) return setStatus(messageStatus, error.message);
  renderMessage(data);
  messageInput.value = "";
});

document.getElementById("linkButton").addEventListener("click", () => {
  const url = prompt("Paste a link:");
  if (!url) return;
  messageInput.value += (messageInput.value ? " " : "") + url;
  messageInput.focus();
});

photoInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return setStatus(messageStatus, "Please select an image.");
  if (file.size > 8 * 1024 * 1024) return setStatus(messageStatus, "Photo must be under 8 MB.");

  setStatus(messageStatus, "Uploading photo…");
  const ext = file.name.split(".").pop().toLowerCase();
  const path = `${profile.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabaseClient.storage.from("chat-photos").upload(path, file, { upsert: false });
  if (uploadError) {
    setStatus(messageStatus, uploadError.message);
    photoInput.value = "";
    return;
  }

  const { data } = supabaseClient.storage.from("chat-photos").getPublicUrl(path);
  const { data: inserted, error } = await supabaseClient.from("messages").insert({
    user_id: profile.id,
    nickname: profile.nickname,
    image_url: data.publicUrl
  }).select().single();

  photoInput.value = "";
  if (error) return setStatus(messageStatus, error.message);
  renderMessage(inserted);
  setStatus(messageStatus);
});

if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) loadProfile(data.session.user).catch(err => setStatus(authStatus, err.message));
  });
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session && !profile) loadProfile(session.user).catch(err => setStatus(authStatus, err.message));
  });
}
