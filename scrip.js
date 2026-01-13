import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, deleteDoc, addDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROJECT.firebaseapp.com",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_PROJECT.appspot.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let usuarioActual = null;

// --- LOGIN PARECIDO AL MODELO ---
window.iniciarSesion = async () => {
    const user = document.getElementById("login-user").value.trim().toLowerCase();
    const pass = document.getElementById("login-pass").value.trim();

    // Acceso directo Admin bypass
    if (user === "admin" && pass === "1130") {
        cargarSesion({ id: "admin", rol: "admin" });
    } else {
        const snap = await getDoc(doc(db, "usuarios", user));
        if (snap.exists() && snap.data().pass === pass) {
            cargarSesion({ id: user, ...snap.data() });
        } else { alert("Credenciales incorrectas"); }
    }
};

function cargarSesion(datos) {
    usuarioActual = datos;
    document.getElementById("pantalla-login").classList.add("hidden");
    document.getElementById("interfaz-app").classList.remove("hidden");
    
    configurarMenu();
    verPagina('solicitudes');
    activarSincronizacion();
}

// --- NAVEGACIÓN ---
function configurarMenu() {
    const menu = document.getElementById("menu-dinamico");
    const rutas = usuarioActual.rol === 'admin' ? 
        [{id:'solicitudes', n:'Solicitudes', i:'file-lines'}, {id:'admin', n:'Estructura', i:'sitemap'}, {id:'usuarios', n:'Usuarios', i:'users-gear'}] :
        [{id:'solicitudes', n:'Mis Solicitudes', i:'folder'}, {id:'crear-sol', n:'Nueva Solicitud', i:'plus'}];

    menu.innerHTML = rutas.map(r => `
        <button onclick="verPagina('${r.id}')" class="w-full flex items-center gap-3 p-4 text-slate-600 hover:bg-indigo-50 rounded-xl transition font-bold">
            <i class="fas fa-${r.i} w-6"></i> ${r.n}
        </button>`).join('');
}

window.verPagina = (id) => {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(`pag-${id}`).classList.remove("hidden");
};

// --- CRUD CORE ---
window.crearDato = async (col, inputId) => {
    const val = document.getElementById(inputId).value.trim();
    if(val) {
        await addDoc(collection(db, col), { nombre: val });
        document.getElementById(inputId).value = "";
    }
};

window.eliminarDato = async (col, id) => {
    if(confirm("¿Eliminar este registro permanentemente?")) await deleteDoc(doc(db, col, id));
};

// --- SOLICITUDES ---
window.enviarSolicitud = async () => {
    const data = {
        nombre: document.getElementById("s-nombre").value,
        tipo: document.getElementById("s-tipo").value,
        gerencia: document.getElementById("s-gerencia").value,
        motivo: document.getElementById("s-motivo").value,
        usuario: usuarioActual.id,
        estado: "pendiente",
        fecha: new Date().toLocaleString()
    };
    await addDoc(collection(db, "solicitudes"), data);
    alert("Solicitud Enviada");
    verPagina('solicitudes');
};

// --- REALTIME SYNC ---
function activarSincronizacion() {
    // Gerencias para el Select
    onSnapshot(collection(db, "gerencias"), snap => {
        const select = document.getElementById("s-gerencia");
        const lista = document.getElementById("lista-gerencias");
        if(select) select.innerHTML = "";
        if(lista) lista.innerHTML = "";
        snap.forEach(d => {
            const g = d.data();
            if(select) select.innerHTML += `<option>${g.nombre}</option>`;
            if(lista) lista.innerHTML += `<li class="flex justify-between p-2 bg-slate-50 rounded-lg"><span>${g.nombre}</span> <button onclick="eliminarDato('gerencias','${d.id}')" class="text-red-400"><i class="fas fa-trash"></i></button></li>`;
        });
    });

    // Departamentos
    onSnapshot(collection(db, "departamentos"), snap => {
        const lista = document.getElementById("lista-deptos");
        lista.innerHTML = "";
        snap.forEach(d => {
            lista.innerHTML += `<li class="flex justify-between p-2 bg-slate-50 rounded-lg"><span>${d.data().nombre}</span> <button onclick="eliminarDato('departamentos','${d.id}')" class="text-red-400"><i class="fas fa-trash"></i></button></li>`;
        });
    });

    // Tabla Solicitudes
    onSnapshot(query(collection(db, "solicitudes"), orderBy("fecha", "desc")), snap => {
        const tabla = document.getElementById("tabla-solicitudes-body");
        tabla.innerHTML = "";
        snap.forEach(d => {
            const s = d.data();
            // Filtrar si no es admin
            if(usuarioActual.rol !== 'admin' && s.usuario !== usuarioActual.id) return;

            tabla.innerHTML += `
                <tr>
                    <td class="p-4 font-mono text-xs">${d.id.substring(0,8)}</td>
                    <td class="p-4 font-bold">${s.nombre}</td>
                    <td class="p-4"><span class="badge status-${s.estado}">${s.estado}</span></td>
                    <td class="p-4 flex gap-2">
                        <button onclick="verDetalle('${d.id}')" class="text-indigo-600 hover:underline">Detalles</button>
                        ${usuarioActual.rol === 'admin' ? `<button onclick="eliminarDato('solicitudes','${d.id}')" class="text-red-400 ml-2"><i class="fas fa-trash"></i></button>` : ''}
                    </td>
                </tr>`;
        });
    });

    // Usuarios (Admin)
    if(usuarioActual.rol === 'admin') {
        onSnapshot(collection(db, "usuarios"), snap => {
            const list = document.getElementById("lista-usuarios-db");
            list.innerHTML = "";
            snap.forEach(d => {
                const u = d.data();
                list.innerHTML += `<div class="p-4 border rounded-xl flex justify-between items-center"><div><b>${d.id}</b><br><small>${u.rol}</small></div><button onclick="eliminarDato('usuarios','${d.id}')" class="text-red-400"><i class="fas fa-trash"></i></button></div>`;
            });
        });
    }
}

window.verDetalle = async (id) => {
    const docSnap = await getDoc(doc(db, "solicitudes", id));
    if (docSnap.exists()) {
        const s = docSnap.data();
        verPagina('detalle');
        document.getElementById("detalle-content").innerHTML = `
            <div class="flex justify-between">
                <h3 class="text-xl font-bold">${s.nombre}</h3>
                <span class="badge status-${s.estado}">${s.estado}</span>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <p><b>Tipo:</b> ${s.tipo}</p>
                <p><b>Gerencia:</b> ${s.gerencia}</p>
                <p><b>Solicitante:</b> ${s.usuario}</p>
                <p><b>Fecha:</b> ${s.fecha}</p>
            </div>
            <hr>
            <p><b>Motivo:</b><br>${s.motivo}</p>
        `;
    }
};

window.guardarUsuario = async () => {
    const id = document.getElementById("u-id").value.trim().toLowerCase();
    const pass = document.getElementById("u-pass").value;
    const rol = document.getElementById("u-rol").value;
    if(id && pass) {
        await setDoc(doc(db, "usuarios", id), { pass, rol });
        alert("Usuario creado");
        document.getElementById("u-id").value = "";
        document.getElementById("u-pass").value = "";
    }
};
