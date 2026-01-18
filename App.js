import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyCtOhGoiGPHYUgyERjg43pt6_QW-gBjhL4", 
    authDomain: "laboratorium-b4253.firebaseapp.com", 
    projectId: "laboratorium-b4253",
    storageBucket: "laboratorium-b4253.firebasestorage.app"
};

const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);
let currentUserData = null;

// ==========================================
// 🛡️ SECURITY: ANTI-F12, ANTI-COPY, ANTI-SNOOP
// ==========================================
(function(){
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.onkeydown = e => {
        if (e.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74)) || (e.ctrlKey && e.keyCode == 85)) return false;
    };
    // Mengunci browser jika console dibuka (Debugger Loop)
    setInterval(() => { (function() { return false; }['constructor']('debugger')['call']()); }, 100);
})();

const getVal = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };

// ==========================================
// 🔑 AUTH STATE & PANEL LOGIC
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const uDoc = await getDoc(doc(db, "users", user.uid));
            if (uDoc.exists()) {
                currentUserData = { ...uDoc.data(), uid: user.uid };
                
                // Cek Ban Status
                if(currentUserData.status === 'banned') {
                    alert("Akses Ditolak: Anda telah di-BAN."); signOut(auth); return;
                }

                syncUI();
                loadProjects();
                loadNews();
                if (window.location.pathname.includes('profile.html')) loadProfileData(currentUserData);
                if (window.location.pathname.includes('user.html')) loadVisitorView();
            }
        } catch (e) { console.error("Sync Error", e); }
    } else {
        const prot = ['dashboard.html', 'project.html', 'media.html', 'profile.html', 'user.html'];
        if (prot.some(p => window.location.pathname.includes(p))) window.location.href = "login.html";
    }
});

function syncUI() {
    const ap = document.getElementById('admin-panel'), mp = document.getElementById('member-panel');
    if(document.getElementById('user-role-badge')) document.getElementById('user-role-badge').innerText = currentUserData.role.toUpperCase();
    if(document.getElementById('user-credits')) document.getElementById('user-credits').innerText = `$${currentUserData.credits || 0}`;
    
    if (currentUserData.role === 'owner') {
        if(ap) ap.style.display = 'block'; if(mp) mp.style.display = 'none';
    } else {
        if(ap) ap.style.display = 'none'; if(mp) mp.style.display = 'block';
    }
}

// ==========================================
// ➕ LOGIN & REGISTER (ID SYNCED)
// ==========================================
const lForm = document.getElementById('loginForm');
if(lForm) lForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, getVal('email'), getVal('password'));
        window.location.href = "dashboard.html";
    } catch (err) { alert("Login Gagal: " + err.message); }
});

const rForm = document.getElementById('registerForm');
if(rForm) rForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = getVal('reg-email'), pass = getVal('reg-password'), name = getVal('reg-name'), phone = getVal('reg-phone');
    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        // BUAT DATA FIRESTORE SEBELUM PINDAH HALAMAN
        await setDoc(doc(db, "users", res.user.uid), {
            name: name, phone: phone, role: 'member', credits: 50, 
            status: 'active', bio: "New Member", decoration: 'none', createdAt: serverTimestamp()
        });
        window.location.href = "dashboard.html";
    } catch (err) { alert("Daftar Gagal: " + err.message); }
});

// ==========================================
// 👤 PROFILE & DECORATION (SAVE FIX)
// ==========================================
const pForm = document.getElementById('profileForm');
if(pForm) pForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
            name: getVal('edit-name'), phone: getVal('edit-phone'), bio: getVal('edit-bio'),
            skills: getVal('edit-skills'), portfolio: getVal('edit-portfolio'),
            photoUrl: getVal('edit-avatar-url'), bannerUrl: getVal('edit-banner-url')
        });
        alert("✅ Profil Berhasil Disimpan!"); location.reload();
    } catch (err) { alert("Gagal Simpan: " + err.message); }
});

window.buyDecoration = async (decoId) => {
    if (currentUserData.credits < 100) return alert("Kredit Kurang!");
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
        credits: currentUserData.credits - 100, decoration: decoId
    });
    alert("Dekorasi Aktif Selamanya!"); location.reload();
};

// ==========================================
// 🚀 REPOSITORY & NEWS
// ==========================================
async function loadProjects() {
    const list = document.getElementById('project-list'); if(!list) return;
    const snap = await getDocs(query(collection(db, "projects"), orderBy("createdAt", "desc")));
    let h = '';
    snap.forEach(d => {
        const data = d.data();
        if (data.status === 'locked' && currentUserData?.role !== 'owner') return;
        h += `<div class="glass card">
            <h3>${data.title} ${data.status==='locked'?'🔒':''}</h3>
            <p>${data.description}</p>
            <div style="margin-top:10px; display:flex; justify-content:space-between;">
                <a href="${data.downloadUrl}" target="_blank" class="btn btn-primary">Get Asset</a>
                <small onclick="window.location.href='user.html?id=${data.authorId}'" style="cursor:pointer; color:cyan;">By: ${data.authorName}</small>
            </div>
        </div>`;
    });
    list.innerHTML = h;
}

async function loadNews() {
    const list = document.getElementById('news-list'); if(!list) return;
    const snap = await getDocs(query(collection(db, "news"), orderBy("createdAt", "desc")));
    let h = '';
    snap.forEach(d => {
        const data = d.data();
        h += `<div class="glass card" style="margin-bottom:10px;"><h4>${data.title}</h4><p>${data.content}</p></div>`;
    });
    list.innerHTML = h;
}

document.getElementById('btnLogout')?.addEventListener('click', () => signOut(auth).then(() => window.location.href = "login.html"));
