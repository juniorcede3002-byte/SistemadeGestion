import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, arrayUnion, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURACIÓN FIREBASE (REEMPLAZA ESTO CON TUS DATOS REALES) ---
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

// --- ESTADO GLOBAL ---
let currentUser = null;
let currentSignId = null;

// --- UTILIDADES DE UI ---
const loader = (show) => document.getElementById("loader").classList.toggle("hide", !show);

// Navegación estilo SPA (Sin recargar)
window.navigate = (viewId) => {
    // 1. Ocultar todas las secciones
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
    
    // 2. Mostrar la seleccionada
    document.getElementById(viewId).classList.add("active");
    
    // 3. Activar botón del menú (buscar por onclick)
    const activeBtn = Array.from(document.querySelectorAll(".nav-item"))
        .find(btn => btn.getAttribute("onclick").includes(viewId));
    if(activeBtn) activeBtn.classList.add("active");

    // 4. Cambiar título superior
    const titles = { viewDashboard: "Dashboard General", viewSolicitudes: "Gestión Documental", viewUsuarios: "Usuarios del Sistema", viewConfig: "Configuración" };
    document.getElementById("pageTitle").innerText = titles[viewId] || "SGC";
};

// Modales
window.openModal = (id) => document.getElementById(id).classList.remove("hide");
window.closeModal = (id) => document.getElementById(id).classList.add("hide");

// --- AUTENTICACIÓN ---
document.getElementById("btnLogin").onclick = async () => {
    const u = document.getElementById("loginUser").value;
    const p = document.getElementById("loginPass").value;
    
    loader(true);
    
    try {
        let user = null;
        // Backdoor Admin
        if (u === "Admin" && p === "1130") user = { usuario: "Admin", role: "admin" };
        else {
            const q = query(collection(db, "Usuarios"), where("usuario", "==", u), where("pass", "==", p));
            const snap = await getDocs(q);
            if(!snap.empty) user = snap.docs[0].data();
        }

        if (user) {
            initSession(user);
        } else {
            Swal.fire("Error", "Credenciales incorrectas", "error");
        }
    } catch (e) {
        console.error(e);
        Swal.fire("Error", "Fallo de conexión", "error");
    } finally {
        loader(false);
    }
};

document.getElementById("btnLogout").onclick = () => location.reload();

function initSession(user) {
    currentUser = user;
    document.getElementById("loginSection").classList.add("hide");
    document.getElementById("appSection").classList.remove("hide");
    
    document.getElementById("displayUser").innerText = user.usuario;
    document.getElementById("displayRole").innerText = user.role.toUpperCase();
    document.getElementById("userAvatar").innerText = user.usuario.charAt(0).toUpperCase();

    // Mostrar menú admin si aplica
    if(user.role === 'admin') document.getElementById("adminMenu").classList.remove("hide");

    loadRealtimeData();
}

// --- DATOS EN TIEMPO REAL (DASHBOARD & TABLAS) ---
let myChart = null;

function loadRealtimeData() {
    const q = query(collection(db, "Solicitudes"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        const tbody = document.getElementById("docsTableBody");
        const timeline = document.getElementById("recentHistory");
        tbody.innerHTML = "";
        timeline.innerHTML = "";

        let stats = { total: 0, pend: 0, ok: 0 };

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;

            // Filtro de seguridad visual
            if(currentUser.role !== 'admin' && data.createdBy !== currentUser.usuario) return;

            // Contadores
            stats.total++;
            if(data.estado === "Pendiente") stats.pend++;
            if(data.estado === "Aprobado") stats.ok++;

            // Render Tabla
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <strong>${data.title}</strong><br>
                    <small style="color:#94a3b8">${new Date(data.createdAt).toLocaleDateString()}</small>
                </td>
                <td>${data.tipo}</td>
                <td>v${data.version}</td>
                <td><span class="badge ${data.estado}">${data.estado}</span></td>
                <td>
                    <button class="btn-icon" onclick="verDetalles('${data.desc}', '${data.fileUrl}')" title="Ver Detalles">
                        <span class="material-icons-round">visibility</span>
                    </button>
                    ${currentUser.role === 'admin' && data.estado === 'Pendiente' ? 
                        `<button class="btn-icon" style="color:#10b981" onclick="firmar('${id}')" title="Aprobar">
                            <span class="material-icons-round">thumb_up</span>
                         </button>
                         <button class="btn-icon" style="color:#ef4444" onclick="rechazar('${id}')" title="Rechazar">
                            <span class="material-icons-round">thumb_down</span>
                         </button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);

            // Render Timeline (Últimos 5)
            if(stats.total <= 5) {
                const div = document.createElement("div");
                div.style.marginBottom = "10px";
                div.style.borderLeft = "2px solid #e2e8f0";
                div.style.paddingLeft = "10px";
                div.innerHTML = `<b>${data.accion}</b> - ${data.title} <br><small>${data.estado}</small>`;
                timeline.appendChild(div);
            }
        });

        // Actualizar Stats UI
        document.getElementById("statTotal").innerText = stats.total;
        document.getElementById("statPendientes").innerText = stats.pend;
        document.getElementById("statAprobados").innerText = stats.ok;

        updateChart(stats);
    });
}

// Gráfico con Chart.js
function updateChart(stats) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    if(myChart) myChart.destroy();
    
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pendiente', 'Aprobado'],
            datasets: [{
                data: [stats.pend, stats.ok],
                backgroundColor: ['#f59e0b', '#10b981'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '75%' }
    });
}

// --- ACCIONES DEL NEGOCIO ---
window.toggleDate = () => {
    const isMod = document.getElementById("solAccion").value === "Modificación";
    document.getElementById("solLastDate").disabled = !isMod;
};

window.crearSolicitud = async () => {
    const title = document.getElementById("solTitle").value;
    if(!title) return Swal.fire("Atención", "Título requerido", "warning");

    loader(true);
    // Simulación de URL de archivo
    const fileUrl = "#"; 

    await addDoc(collection(db, "Solicitudes"), {
        title,
        tipo: document.getElementById("solTipo").value,
        accion: document.getElementById("solAccion").value,
        version: document.getElementById("solVersion").value || "1.0",
        desc: document.getElementById("solDesc").value,
        fileUrl,
        estado: "Pendiente",
        createdBy: currentUser.usuario,
        createdAt: new Date().toISOString()
    });

    loader(false);
    closeModal('modalNewSol');
    Swal.fire("Éxito", "Solicitud creada correctamente", "success");
};

window.verDetalles = (desc, url) => {
    Swal.fire({
        title: 'Detalles',
        text: desc,
        footer: `<a href="${url}" target="_blank">Ver Archivo Adjunto</a>`
    });
};

// --- FIRMA DIGITAL ---
const canvas = document.getElementById("signaturePad");
const ctx = canvas.getContext("2d");
let drawing = false;

// Eventos Mouse/Touch para Canvas
const getPos = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return {x, y};
};

['mousedown', 'touchstart'].forEach(ev => canvas.addEventListener(ev, (e) => { drawing=true; ctx.beginPath(); const p=getPos(e); ctx.moveTo(p.x, p.y); }));
['mousemove', 'touchmove'].forEach(ev => canvas.addEventListener(ev, (e) => { if(drawing){ e.preventDefault(); const p=getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }}));
['mouseup', 'touchend'].forEach(ev => canvas.addEventListener(ev, () => drawing=false));

document.getElementById("btnClearSign").onclick = () => ctx.clearRect(0,0,400,200);

window.firmar = (id) => {
    currentSignId = id;
    ctx.clearRect(0,0,400,200);
    openModal('modalSign');
};

document.getElementById("btnConfirmSign").onclick = async () => {
    loader(true);
    const firma = canvas.toDataURL(); // Base64 imagen
    
    await updateDoc(doc(db, "Solicitudes", currentSignId), {
        estado: "Aprobado",
        firmaAdmin: firma,
        fechaAprobacion: new Date().toISOString()
    });

    loader(false);
    closeModal('modalSign');
    Swal.fire("Aprobado", "Documento firmado digitalmente", "success");
};

window.rechazar = async (id) => {
    const res = await Swal.fire({title: "¿Rechazar?", text: "No podrá deshacerse", icon: "warning", showCancelButton: true});
    if(res.isConfirmed) {
        loader(true);
        await updateDoc(doc(db, "Solicitudes", id), { estado: "Rechazado" });
        loader(false);
    }
};

// Crear usuario (Admin)
document.getElementById("btnCreateUser").onclick = async () => {
    const u = document.getElementById("uName").value;
    const p = document.getElementById("uPass").value;
    const r = document.getElementById("uRole").value;
    
    if(u && p) {
        await addDoc(collection(db, "Usuarios"), { usuario: u, pass: p, role: r });
        Swal.fire("Usuario Creado", "", "success");
        document.getElementById("uName").value = "";
        document.getElementById("uPass").value = "";
    }
};
