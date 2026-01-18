import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { /* TUS DATOS DE FIREBASE */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentUser = null;

// --- NAVEGACIÓN ---
window.showView = (id) => {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    // Marcar link activo
    const activeLink = Array.from(document.querySelectorAll('.nav-link'))
        .find(l => l.getAttribute('onclick').includes(id));
    if(activeLink) activeLink.classList.add('active');
};

// --- LOGIN Y ROLES ---
window.login = async () => {
    const user = document.getElementById('user').value;
    const pass = document.getElementById('pass').value;

    if(user === "Admin" && pass === "1234") {
        currentUser = { nombre: "Admin", rol: "admin" };
    } else {
        currentUser = { nombre: user, rol: "applicant" };
    }

    setupUI();
};

function setupUI() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    document.getElementById('display-name').innerText = currentUser.nombre;
    document.getElementById('display-role').innerText = currentUser.rol.toUpperCase();

    // Filtro de Roles
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => el.style.display = currentUser.rol === 'admin' ? 'block' : 'none');

    loadData();
}

// --- DATOS REALTIME ---
function loadData() {
    // Suministros
    onSnapshot(collection(db, "Suministros"), (snap) => {
        const tbody = document.querySelector("#table-stock tbody");
        tbody.innerHTML = "";
        let total = 0;
        snap.forEach(doc => {
            const data = doc.data();
            total++;
            tbody.innerHTML += `<tr><td>${data.nombre}</td><td>${data.cantidad}</td><td>${data.estado}</td><td>...</td></tr>`;
        });
        document.getElementById('count-stock').innerText = total;
    });

    // Solicitudes (Solo las propias si no es admin)
    let q = collection(db, "Solicitudes");
    if(currentUser.rol !== 'admin') {
        q = query(collection(db, "Solicitudes"), where("usuario", "==", currentUser.nombre));
    }
    
    onSnapshot(q, (snap) => {
        let pending = 0;
        snap.forEach(doc => if(doc.data().estado === 'Pendiente') pending++);
        document.getElementById('count-pending').innerText = pending;
    });
}

window.logout = () => location.reload();
