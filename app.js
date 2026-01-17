// ... (Configuración de Firebase y Cloudinary igual al anterior) ...

// Nueva función: Manejo de Permisos UI
function applyPermissions() {
  const isAdmin = currentUser.role === 'admin';
  
  // Ocultar pestañas solo para admin
  document.querySelector('[data-tab="tabUsuarios"]').style.display = isAdmin ? 'block' : 'none';
  document.querySelector('[data-tab="tabDepartamentos"]').style.display = isAdmin ? 'block' : 'none';
  document.querySelector('[data-tab="tabGerencias"]').style.display = isAdmin ? 'block' : 'none';

  // Si no es admin, solo ve sus solicitudes (esto requiere lógica en loadSolicitudes)
  loadSolicitudes();
}

// Mejora en la visualización de solicitudes (Aprobación/Rechazo)
async function loadSolicitudes() {
  solList.innerHTML = "";
  const snapshot = await getDocs(collection(db, "Solicitudes"));

  snapshot.forEach(docu => {
    const data = docu.data();
    
    // Filtrado básico: si no es admin, solo ve lo que él creó
    if (currentUser.role !== 'admin' && data.createdBy !== currentUser.name) return;

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div>
        <strong>${data.title}</strong> <span class="badge ${data.estado}">${data.estado}</span>
        <br><small>Por: ${data.createdBy} - Dept: ${data.dept}</small>
      </div>
      <div class="actions">
        ${data.fileUrl ? `<a href="${data.fileUrl}" target="_blank">📄 Ver Archivo</a>` : ''}
        <button onclick="verDetalles('${docu.id}')">Detalles</button>
        ${currentUser.role === 'admin' ? `
          <button class="approve" onclick="cambiarEstado('${docu.id}', 'Aprobado')">Aprobar</button>
          <button class="delete" onclick="cambiarEstado('${docu.id}', 'Rechazado')">Rechazar</button>
        ` : ''}
      </div>
    `;
    solList.appendChild(div);
  });
}

// Función Escalable: Cambiar estado de solicitud
window.cambiarEstado = async (id, nuevoEstado) => {
  const ref = doc(db, "Solicitudes", id);
  await updateDoc(ref, { 
    estado: nuevoEstado,
    // Agregamos al historial sin borrar lo anterior
    historial: arrayUnion({ 
      estado: nuevoEstado, 
      fecha: new Date().toISOString(), 
      comentario: `Cambiado por ${currentUser.name}` 
    })
  });
  loadAll();
};

// Mejora: Limpiar formularios después de enviar
const clearForm = (ids) => ids.forEach(id => document.getElementById(id).value = "");
