import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MaterialesService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/materiales';

  materiales = signal<any[]>([]);

  cargarMateriales() {
    this.http.get<any[]>(this.apiUrl).subscribe(data => {
      this.materiales.set(data);
    });
  }

  crearMaterial(material: any) {
    return this.http.post(this.apiUrl, material).pipe(
      tap(() => this.cargarMateriales())
    );
  }
}