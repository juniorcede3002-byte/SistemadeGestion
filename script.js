/* PARTE 3: LÓGICA JAVASCRIPT - SGC PRO GOLD */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, query, where, onSnapshot, 
    doc, updateDoc, getDoc, setDoc, arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. CONFIGURACIÓN FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDdzCiachuhbE9jATz-TesPI2vUVIJrHjM",
    authDomain: "sistemadegestion-7400d.firebaseapp.com",
    projectId: "sistemadegestion-7400d",
    storageBucket: "sistemadegestion-7400d.appspot.com",
    messagingSenderId: "709030283072",
    appId: "1:709030283072:web:5997837b36a448e9515ca5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. VARIABLES DE ESTADO
let currentUser = null;
let selectedDocId = null;
let allDocs = [];

// Definición de Pasos ISO 9001
const STEPS = [
    { label: "Paso 1: Elaborado", role: "applicant" },
    { label: "Paso 2: Verificado", role: "verifier" },
    { label: "Paso 3: Validado SGC", role: "admin" },
    { label: "Paso 4: Aprobado Gerencia", role: "manager" }
];

// 3. AUTENTICACIÓN
document.getElementById('btnLogin').onclick = async () => {
    const u = document.getElementById('userInput').value;
    const p = document.getElementById('passInput').value;
    
    showLoading(true);
    const q = query(collection(db, "Usuarios"), where("usuario", "==", u), where("pass", "==", p));
    const snap = await getDocs(q);
    
    if(!snap.empty) {
        currentUser = snap.docs[0].data();
        initApp();
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('sidebar').style.display = 'flex';
        document.getElementById('main-content').style.display = 'block';
    } else {
        alert("Acceso Denegado: Usuario o clave inválidos.");
    }
    showLoading(false);
};

// 4. INICIALIZACIÓN DEL SISTEMA
function initApp() {
    // Configurar Perfil
    document.getElementById('u-name-display').innerText = currentUser.nombre;
    document.getElementById('u-role-display').innerText = currentUser.role.toUpperCase();
    document.getElementById('u-initial').innerText = currentUser.nombre.charAt(0);
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if(currentUser.role === 'admin') document.getElementById('admin-menu').style.display = 'block';

    // Cargar Catálogos (Gerencias)
    onSnapshot(collection(db, "Gerencias"), s => {
        let opt = ""; s.forEach(d => opt += `<option>${d.data().nombre}</option>`);
        document.getElementById('sol-ger').innerHTML = opt;
        document.getElementById('u-ger-assign').innerHTML = opt;
    });

    // Sincronización de Solicitudes
    onSnapshot(collection(db, "Solicitudes"), snap => {
        allDocs = [];
        snap.forEach(d => allDocs.push({id: d.id, ...d.data()}));
        renderTable(allDocs);
        updateDashboard(allDocs);
    });
}

// 5. NAVEGACIÓN Y DASHBOARD
window.cambiarVista = (id, btn) => {
    document.querySelectorAll('.section, .nav-link').forEach(e => e.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(btn) btn.classList.add('active');
};

function updateDashboard(data) {
    document.getElementById('c-total').innerText = data.length;
    document.getElementById('c-rev').innerText = data.filter(d => d.firmaActual < 3).length;
    document.getElementById('c-ok').innerText = data.filter(d => d.firmaActual === 3).length;
    document.getElementById('c-reject').innerText = data.filter(d => d.estado === "Rechazado").length;
}

// 6. BUSCADOR
document.getElementById('main-search').oninput = (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allDocs.filter(d => 
        d.customId.toLowerCase().includes(term) || 
        d.titulo.toLowerCase().includes(term) ||
        d.solicitante.toLowerCase().includes(term)
    );
    renderTable(filtered);
};

function renderTable(data) {
    const tbody = document.querySelector('#table-sol tbody');
    tbody.innerHTML = "";
    data.forEach(s => {
        // Filtro de Seguridad: Ver solo lo de su gerencia (excepto admin/manager)
        const canView = (currentUser.role === 'admin' || currentUser.role === 'manager' || s.gerencia === currentUser.gerencia);
        if(!canView) return;

        tbody.innerHTML += `
            <tr>
                <td><span style="font-weight:700; color:var(--primary)">${s.customId}</span></td>
                <td>${s.titulo}</td>
                <td>${s.solicitante}</td>
                <td>
                    <div style="display:flex; gap:3px;">
                        ${[0,1,2,3].map(i => `<div style="width:8px; height:8px; border-radius:50%; background:${i <= s.firmaActual ? 'var(--success)' : '#cbd5e1'}"></div>`).join('')}
                    </div>
                    <small style="font-size:10px; color:var(--text-muted)">${s.estado}</small>
                </td>
                <td>
                    <button class="btn btn-primary" onclick="openPanel('${s.id}')" style="padding:6px 12px; font-size:11px;">
                        GESTIONAR
                    </button>
                </td>
            </tr>`;
    });
}

// 7. CREAR SOLICITUD
document.getElementById('btnSend').onclick = async () => {
    const tit = document.getElementById('sol-tit').value;
    const jus = document.getElementById('sol-jus').value;
    if(!tit || !jus) return alert("Error: Título y Justificación son obligatorios.");

    showLoading(true);
    const fci = "FCI-" + Math.floor(Math.random() * 900000);
    const newDoc = {
        customId: fci,
        titulo: tit,
        justificacion: jus,
        gerencia: document.getElementById('sol-ger').value,
        solicitante: currentUser.nombre,
        firmaActual: 0,
        estado: STEPS[0].label,
        chat: [{ user: "SISTEMA", msg: "Documento elaborado e ingresado al flujo ISO.", time: new Date().toLocaleTimeString(), uid: "sys" }]
    };

    await addDoc(collection(db, "Solicitudes"), newDoc);
    showLoading(false);
    alert("Solicitud Enviada con Éxito");
    cambiarVista('sec-historial');
};

// 8. PANEL DE GESTIÓN (MODAL)
window.openPanel = async (id) => {
    selectedDocId = id;
    const snap = await getDoc(doc(db, "Solicitudes", id));
    const s = snap.data();

    // Actualizar UI Modal
    document.getElementById('m-fci').innerText = s.customId;
    document.getElementById('m-tit').innerText = s.titulo;
    document.getElementById('m-body').innerHTML = `
        <div class="card" style="box-shadow:none; background:#f8fafc; margin:0;">
            <p><strong>Detalle Técnico:</strong> ${s.justificacion}</p>
            <p><strong>Gerencia Origen:</strong> ${s.gerencia}</p>
        </div>
    `;

    // Actualizar Línea de Tiempo de Firmas
    for(let i=0; i<4; i++) {
        const el = document.getElementById(`step-${i+1}`);
        el.classList.remove('active', 'completed');
        if(i < s.firmaActual) el.classList.add('completed');
        if(i === s.firmaActual) el.classList.add('active');
    }

    // Lógica de Permisos para Firmar
    const actionPanel = document.getElementById('m-actions');
    const isStepActive = (STEPS[s.firmaActual].role === currentUser.role);
    
    actionPanel.style.display = (isStepActive && s.firmaActual < 4 && s.estado !== "Rechazado") ? 'block' : 'none';
    if(s.firmaActual === 3 && s.estado !== "Rechazado") {
        document.getElementById('m-body').innerHTML += `<div style="color:var(--success); font-weight:800; padding:15px; border:2px solid; border-radius:10px; margin-top:15px; text-align:center;">✓ DOCUMENTO OFICIAL Y VIGENTE</div>`;
    }

    renderChat(s.chat);
    document.getElementById('modal').style.display = 'flex';
};

// 9. FIRMA Y AVANCE
document.getElementById('btn-next-step').onclick = async () => {
    const snap = await getDoc(doc(db, "Solicitudes", selectedDocId));
    const currentStep = snap.data().firmaActual;
    
    if(currentStep < 3) {
        const nextStep = currentStep + 1;
        await updateDoc(doc(db, "Solicitudes", selectedDocId), {
            firmaActual: nextStep,
            estado: STEPS[nextStep].label,
            chat: arrayUnion({
                user: "SISTEMA",
                msg: `Firma registrada por ${currentUser.nombre}. Avance a ${STEPS[nextStep].label}`,
                time: new Date().toLocaleTimeString(),
                uid: "sys"
            })
        });
        alert("Firma procesada.");
        window.closeModal();
    }
};

// 10. SISTEMA DE CHAT
document.getElementById('btnChatSend').onclick = async () => {
    const input = document.getElementById('chat-input');
    if(!input.value) return;

    const newMsg = {
        user: currentUser.nombre,
        msg: input.value,
        time: new Date().toLocaleTimeString(),
        uid: currentUser.usuario
    };

    await updateDoc(doc(db, "Solicitudes", selectedDocId), {
        chat: arrayUnion(newMsg)
    });

    input.value = "";
    // Re-render chat
    const snap = await getDoc(doc(db, "Solicitudes", selectedDocId));
    renderChat(snap.data().chat);
};

function renderChat(mensajes) {
    const box = document.getElementById('chat-box');
    box.innerHTML = mensajes.map(m => `
        <div class="chat-msg ${m.uid === currentUser.usuario ? 'sent' : 'received'}">
            <small>${m.user} • ${m.time}</small>
            ${m.msg}
        </div>
    `).join('');
    box.scrollTop = box.scrollHeight;
}

// 11. UTILERÍA
window.closeModal = () => document.getElementById('modal').style.display = 'none';

function showLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

// Crear Usuario (Admin)
document.getElementById('btnUser').onclick = async () => {
    const uData = {
        nombre: document.getElementById('u-nom').value,
        usuario: document.getElementById('u-usr').value,
        pass: document.getElementById('u-pas').value,
        email: document.getElementById('u-mail').value,
        role: document.getElementById('u-rol').value,
        gerencia: document.getElementById('u-ger-assign').value
    };
    await setDoc(doc(db, "Usuarios", uData.usuario), uData);
    alert("Personal Registrado.");
};

// Script oculto para admin inicial
document.getElementById('btn-reset-hidden').onclick = async () => {
    await setDoc(doc(db, "Usuarios", "admin"), { nombre: "Admin SGC", usuario: "admin", pass: "1234", role: "admin", gerencia: "Calidad" });
    await setDoc(doc(db, "Gerencias", "G1"), { nombre: "Calidad" });
    await setDoc(doc(db, "Gerencias", "G2"), { nombre: "Operaciones" });
    alert("Sistema Reseteado: admin / 1234");
};
