import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBOBoKSfYRz_3z__n0CPGplfLh7I2Qku_I",
    authDomain: "academysawit.firebaseapp.com",
    projectId: "academysawit",
    storageBucket: "academysawit.firebasestorage.app",
    messagingSenderId: "144501931796",
    appId: "1:144501931796:web:33ed8b6131a21bf9dacc01"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// FIX 1: Login tetap tersimpan meskipun browser ditutup
setPersistence(auth, browserLocalPersistence);

// --- FUNGSI AUTH ---
window.handleRegister = async () => {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const pass = document.getElementById('regPass').value;

    if (!name || !email || !phone || !pass) return alert("Lengkapi data!");
    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "members", res.user.uid), {
            name, email, phone, role: "NEWBIE", createdAt: new Date()
        });
        window.location.href = "profile.html";
    } catch (e) { alert(e.message); }
};

window.handleLogin = async () => {
    const email = document.getElementById('logEmail').value;
    const pass = document.getElementById('logPass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        window.location.href = "profile.html";
    } catch (e) { alert("Email/Password Salah!"); }
};

window.logout = () => signOut(auth).then(() => {
    localStorage.removeItem('userCache');
    window.location.href = "index.html";
});

// --- MONITORING USER & NAVIGASI DINAMIS ---
onAuthStateChanged(auth, async (user) => {
    const authBtn = document.getElementById('auth-nav-btn');
    const path = window.location.pathname;

    if (user) {
        if (authBtn) { authBtn.innerText = "DASHBOARD"; authBtn.href = "profile.html"; }

        // Load Cache agar ID Card instan
        const cache = localStorage.getItem('userCache');
        if (cache) renderIDCard(JSON.parse(cache), user.uid);

        // Ambil Data Terbaru
        const snap = await getDoc(doc(db, "members", user.uid));
        if (snap.exists()) {
            const data = snap.data();
            localStorage.setItem('userCache', JSON.stringify(data));
            renderIDCard(data, user.uid);
            updateRoleUI(data.role);
        }
    } else {
        if (authBtn) { authBtn.innerText = "STUDENT LOGIN"; authBtn.href = "login.html"; }
        if (path.includes("profile.html")) window.location.href = "login.html";
    }
});

function renderIDCard(data, uid) {
    if(document.getElementById('userNameDisplay')) document.getElementById('userNameDisplay').innerText = data.name;
    if(document.getElementById('userRoleDisplay')) document.getElementById('userRoleDisplay').innerText = data.role;
    if(document.getElementById('memberIDDisplay')) document.getElementById('memberIDDisplay').innerText = `ZNTH-${uid.substring(0,5).toUpperCase()}`;
    if(document.getElementById('myAccountID')) document.getElementById('myAccountID').value = uid;
}

function updateRoleUI(role) {
    if (role !== "NEWBIE") document.querySelectorAll('.student-only').forEach(el => el.style.display = "block");
    if (role === "OWNER") document.getElementById('owner-area').style.display = "block";
}
