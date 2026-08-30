mod atomic;
mod attachments;
mod corrupt;
mod backup;
mod folders;
mod path_safety;
mod inbox;
mod tasks;
mod vault;
mod widget_geo;

use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Atalho global: Ctrl+Shift+Space invoca o widget de qualquer lugar.
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{
                    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
                };
                let summon = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);
                let summon_for_handler = summon;
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |app, scut, event| {
                            if scut == &summon_for_handler && event.state() == ShortcutState::Pressed
                            {
                                if let Some(w) = app.get_webview_window("widget") {
                                    let _ = w.show();
                                    let _ = w.set_focus();
                                    let _ = app.emit("widget-summon", ());
                                }
                            }
                        })
                        .build(),
                )?;
                if let Err(e) = app.global_shortcut().register(summon) {
                    // Ctrl+Shift+Space pode ja estar em uso por outro programa; avisa o
                    // frontend em vez de falhar calado (a bolinha nunca apareceria).
                    let _ = app.emit("shortcut-register-failed", e.to_string());
                }
            }

            // Posiciona o widget no canto inferior direito e o exibe.
            if let Some(widget) = app.get_webview_window("widget") {
                if let Ok(Some(monitor)) = widget.primary_monitor() {
                    let size = monitor.size();
                    let scale = monitor.scale_factor();
                    let win = 104.0;
                    let margin = 8.0;
                    let taskbar = 56.0;
                    let x = (size.width as f64 / scale) - win - margin;
                    let y = (size.height as f64 / scale) - win - margin - taskbar;
                    let _ = widget.set_position(tauri::LogicalPosition::new(x, y));
                }
                let _ = widget.show();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            vault::vault_load,
            vault::vault_save,
            vault::vault_delete,
            inbox::inbox_list,
            inbox::inbox_set,
            inbox::inbox_add,
            inbox::inbox_remove,
            attachments::save_attachment,
            attachments::attachment_remove,
            attachments::attachment_read,
            folders::folders_load,
            folders::folders_save,
            tasks::tasks_load,
            tasks::tasks_save,
            backup::backup_now,
            backup::backups_folder,
            backup::backups_list,
            backup::backup_restore,
            widget_geo::widget_set_geometry
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
