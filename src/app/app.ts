import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { MaterialesService } from './services/materiales';
import { ProyectosService } from './services/proyectos';
import { CiudadesService } from './services/ciudades';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  materialesService = inject(MaterialesService);
  proyectosService = inject(ProyectosService);
  ciudadesService = inject(CiudadesService);
  
  vistaActual = signal<'materiales' | 'proyectos' | 'ciudades'>('materiales');
  cargando = signal(true);
  mensajeExito = signal('');
  
  // --- LÓGICA MATERIALES ---
  mostrarFormulario = signal(false);
  nuevoMaterial = { codigo: '', descripcion: '', precio: 0, unidad_id: 1 };

  // --- LÓGICA PROYECTOS ---
  mostrarFormularioProyecto = signal(false);
  nuevoProyecto = { nombre: '', presupuesto: 0, departamento_id: null, ciudad_id: null };
  ciudadesFiltradas = signal<any[]>([]);
  
  // Extraemos departamentos únicos
  departamentosUnicos = computed(() => {
    const depts = this.ciudadesService.ciudades().map((c: any) => c.departamento).filter((d: any) => d);
    return Array.from(new Set(depts.map((d: any) => d.id))).map(id => depts.find((d: any) => d.id === id));
  });

  // --- LÓGICA ASIGNACIÓN ---
  mostrarAsignacion = signal(false);
  mostrarReporte = signal(false);
  proyectoSeleccionado = signal<any>(null);
  materialAAsignar = signal<number | null>(null);
  reporteActual = signal<any>(null);

  // --- NUEVA LÓGICA: RECIBOS Y ASIGNACIÓN MULTIPLE ---
  asignacionProyectoId = 0;
  asignacionCiudadId = 0;
  materialesNuevosAsignados: { materialId: number, cantidad: number }[] = [];
  reciboFinal: any = null;

  ngOnInit() {
    this.materialesService.cargarMateriales();
    this.proyectosService.cargarProyectos();
    this.ciudadesService.cargarCiudades();
    setTimeout(() => this.cargando.set(false), 500);
  }

  cambiarVista(vista: 'materiales' | 'proyectos' | 'ciudades') {
    this.vistaActual.set(vista);
  }

  mostrarToast(mensaje: string) {
    this.mensajeExito.set(mensaje);
    setTimeout(() => this.mensajeExito.set(''), 3000);
  }

  guardarMaterial() {
    if (!this.nuevoMaterial.codigo || !this.nuevoMaterial.descripcion) return;
    this.materialesService.crearMaterial(this.nuevoMaterial).subscribe(() => {
      this.mostrarFormulario.set(false);
      this.nuevoMaterial = { codigo: '', descripcion: '', precio: 0, unidad_id: 1 };
      this.mostrarToast('Material registrado');
    });
  }

  alCambiarDepartamento() {
    const filtradas = this.ciudadesService.ciudades().filter((c: any) => c.departamento?.id === Number(this.nuevoProyecto.departamento_id));
    this.ciudadesFiltradas.set(filtradas);
    this.nuevoProyecto.ciudad_id = null;
  }

  guardarProyecto() {
    if (!this.nuevoProyecto.nombre || !this.nuevoProyecto.ciudad_id) {
      alert('Por favor ingrese el nombre y seleccione una ciudad.');
      return;
    }

    // Tomamos un ID de material real para inicializar el proyecto cumpliendo el DTO
    const listaMateriales = this.materialesService.materiales();
    const idMaterialInicial = listaMateriales.length > 0 ? Number(listaMateriales[0].id) : 1;

    // PAYLOAD EXACTO SEGÚN TU DTO
    const payload = {
      nombre: String(this.nuevoProyecto.nombre).trim(),
      ciudad_id: Number(this.nuevoProyecto.ciudad_id),
      materiales_ids: [idMaterialInicial] 
    };

    this.proyectosService.crearProyecto(payload).subscribe({
      next: (res: any) => {
        this.mostrarFormularioProyecto.set(false);
        this.nuevoProyecto = { nombre: '', presupuesto: 0, departamento_id: null, ciudad_id: null };
        this.mostrarToast('¡Proyecto creado con éxito!');
        this.proyectosService.cargarProyectos();
      },
      error: (err: any) => {
        console.error('Error 400:', err.error);
        alert('Error al guardar: ' + JSON.stringify(err.error?.message));
      }
    });
  }

  // --- NUEVOS MÉTODOS PARA EL RECIBO ---
  agregarFilaMaterial() {
    this.materialesNuevosAsignados.push({ materialId: 0, cantidad: 1 });
  }

  removerFilaMaterial(index: number) {
    this.materialesNuevosAsignados.splice(index, 1);
  }

  // --- CORRECCIÓN: GUARDAR ASIGNACIÓN ---
  guardarAsignacionYRecibo() {
    if (!this.asignacionProyectoId || !this.asignacionCiudadId) {
      alert('Debes seleccionar un proyecto y la ciudad destino de envío');
      return;
    }

    const materialesValidos = this.materialesNuevosAsignados.filter(m => Number(m.materialId) > 0 && m.cantidad > 0);
    
    if (materialesValidos.length === 0) {
      alert('Debes añadir al menos un material válido a la lista.');
      return;
    }

    this.proyectosService.asignarDetalles(
      this.asignacionProyectoId, 
      Number(this.asignacionCiudadId), 
      materialesValidos
    ).subscribe({
      next: (res: any) => {
        this.mostrarToast('Recursos asignados con éxito');
        this.reciboFinal = res; 
      },
      error: (err: any) => {
        console.error('Error al asignar recursos:', err);
        alert('Hubo un error al generar el recibo.');
      }
    });
  }

  consultarRecibo() {
    if (!this.asignacionProyectoId) {
      alert('Selecciona un proyecto primero');
      return;
    }
    this.proyectosService.obtenerRecibo(this.asignacionProyectoId).subscribe((res: any) => {
      this.reciboFinal = res;
    });
  }

  // --- NUEVO: MÉTODO PARA DESCARGAR EL PDF DESDE EL COMPONENTE ---
  descargarPdf(id: number) {
    this.proyectosService.descargarReciboPdf(id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `liquidacion-idrd-${id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar el PDF:', err);
        alert('Hubo un problema al generar el documento PDF.');
      }
    });
  }
}