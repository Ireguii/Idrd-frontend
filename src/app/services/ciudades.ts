import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CiudadesService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/ciudades';

  ciudades = signal<any[]>([]);

  cargarCiudades() {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => this.ciudades.set(data),
      error: (err) => console.error('Error cargando ciudades', err)
    });
  }
}