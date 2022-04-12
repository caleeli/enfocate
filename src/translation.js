const translations = {
    inactive: "Inactiva",
    paused: "Pausada",
    active: "Activa",
    completed: "Completada",
    canceled: "Cancelada",
    cancel: "Cancelar",
    start: "Iniciar",
    pause: "Pausar",
    continue: "Continuar",
    time: "Tiempo",
    add: "Añadir",
    edit: "Editar",
};

export function translation(text) {
    return translations[text] || text;
}
