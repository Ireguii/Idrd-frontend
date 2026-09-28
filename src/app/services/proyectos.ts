import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProyectosService {
  private http = inject(HttpClient);
  // Ajusta la URL si tu backend usa otro puerto diferente al 3000
  private apiUrl = 'http://localhost:3000/proyectos'; 

  // Mantenemos tu Signal original para cargar la tabla
  proyectos = signal<any[]>([]);

  cargarProyectos() {
    this.http.get<any[]>(this.apiUrl).subscribe(data => {
      this.proyectos.set(data);
    });
  }

  crearProyecto(proyecto: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, proyecto);
  }

  // --- TUS MÉTODOS ANTERIORES DE ASIGNACIÓN Y REPORTE ---
  asignarMaterial(proyectoId: number, materialId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${proyectoId}/materiales`, { materialId });
  }

  obtenerReporte(proyectoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${proyectoId}/reporte`);
  }

  // --- LOS MÉTODOS PARA EL RECIBO ---
  asignarDetalles(proyectoId: number, ciudadId: number, materiales: { materialId: number, cantidad: number }[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/${proyectoId}/asignar`, { ciudadId, materiales });
  }

  obtenerRecibo(proyectoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${proyectoId}/recibo`);
  }

  // --- NUEVO: MÉTODO PARA DESCARGAR EL PDF ---
  descargarReciboPdf(id: number): Observable<Blob> {
    // Es crucial el responseType: 'blob' para que Angular no intente leer el PDF como un JSON
    return this.http.get(`${this.apiUrl}/${id}/recibo/pdf`, { responseType: 'blob' });
  }
}