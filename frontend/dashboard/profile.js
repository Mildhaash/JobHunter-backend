// ---------- My Profile page ----------

const nameInput = document.getElementById("nameInput");
const emailInput = document.getElementById("emailInput");
const nameError = document.getElementById("nameError");
const emailError = document.getElementById("emailError");
const saveConfirm = document.getElementById("saveConfirm");
const avatarBig = document.getElementById("profileAvatarBig");
const form = document.getElementById("profileForm");

async function initProfilePage() {
  const user = await DataStore.checkSession();
  if (!user) {
    window.location.href = "../Homepage/login.html";
    return;
  }
  await renderNav(null);
  await loadProfile();
  attachProfileListeners();
}

document.addEventListener("DOMContentLoaded", initProfilePage);

async function loadProfile() {
  const profile = await DataStore.getProfile();
  nameInput.value = profile.name || "";
  emailInput.value = profile.email || "";
  avatarBig.textContent = (profile.name || "U").trim().charAt(0).toUpperCase() || "U";
}

function validate() {
  let valid = true;
  nameError.textContent = "";
  emailError.textContent = "";

  if (!nameInput.value.trim()) {
    nameError.textContent = "Name is required.";
    valid = false;
  }
  if (!emailInput.value.trim()) {
    emailError.textContent = "Email is required.";
    valid = false;
  } else if (!/^\S+@\S+\.\S+$/.test(emailInput.value.trim())) {
    emailError.textContent = "Enter a valid email address.";
    valid = false;
  }
  return valid;
}

function attachProfileListeners() {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    saveConfirm.hidden = true;
    if (!validate()) return;

    const profile = { name: nameInput.value.trim(), email: emailInput.value.trim() };
    await DataStore.saveProfile(profile);
    avatarBig.textContent = profile.name.charAt(0).toUpperCase();
    await renderNav(null);
    saveConfirm.hidden = false;
  });
}
