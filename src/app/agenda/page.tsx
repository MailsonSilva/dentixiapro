"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  format, 
  addDays, 
  startOfWeek, 
  isSameDay, 
  isSameMonth,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  addMonths, 
  subMonths,
  parseISO
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, User, Check, X, Search, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNotification } from "@/lib/NotificationContext";
import { useSearchParams } from "next/navigation";

// Exemplo de Tipos de Procedimentos para Color/Filtros
const PROCEDURE_FILTERS = [
  { name: "Avaliação", color: "bg-blue-100/80 border-blue-200 text-blue-700 checkbox-blue" },
  { name: "Limpeza", color: "bg-emerald-100/80 border-emerald-200 text-emerald-700 checkbox-emerald" },
  { name: "Cirurgia", color: "bg-red-100/80 border-red-200 text-red-700 checkbox-red" },
  { name: "Retorno", color: "bg-amber-100/80 border-amber-200 text-amber-700 checkbox-amber" },
  { name: "Ortodontia", color: "bg-purple-100/80 border-purple-200 text-purple-700 checkbox-purple" },
];

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { notify } = useNotification();
  const searchParams = useSearchParams();
  
  // Selection States
  const [selectedFilters, setSelectedFilters] = useState<string[]>(PROCEDURE_FILTERS.map(f => f.name));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingApp, setIsSavingApp] = useState(false);
  
  // Modal states
  const [newApptDate, setNewApptDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newApptTime, setNewApptTime] = useState("09:00");
  const [newApptProcedure, setNewApptProcedure] = useState("Avaliação");
  const [newApptContact, setNewApptContact] = useState<any>(null);
  
  // Custom contact dropdown control
  const [searchContactText, setSearchContactText] = useState("");
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);

  useEffect(() => {
    fetchAppointments();
    
    // Auto-open modal se vier da tela de clientes
    const preContactId = searchParams.get('contact_id');
    if (preContactId) {
      // Find that contact and auto open
      const fetchAndOpen = async () => {
         const { data } = await supabase.from('contacts').select('*').eq('id', preContactId).single();
         if(data) {
           setNewApptContact(data);
           setIsModalOpen(true);
         }
      }
      fetchAndOpen();
    }
  }, [currentDate, searchParams]);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      const start = startOfWeek(monthStart, { weekStartsOn: 1 });
      const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

      const [apptRes, contactsRes] = await Promise.all([
        supabase
          .from("appointments")
          .select(`*, contacts(id, name, phone, email)`)
          .gte('start_time', start.toISOString())
          .lte('start_time', end.toISOString()),
        supabase.from("contacts").select("*").order("name")
      ]);

      if (apptRes.error) throw apptRes.error;
      if (contactsRes.error) throw contactsRes.error;
      
      setAppointments(apptRes.data || []);
      setContacts(contactsRes.data || []);
      
    } catch (error: any) {
      notify("Erro ao buscar agenda", error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  // Month Grid Calculation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Starts Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDayNames = Array.from({ length: 7 }).map((_, i) => format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i), 'EEEE', { locale: ptBR }));

  const handleDayClick = (day: Date) => {
    setNewApptDate(format(day, 'yyyy-MM-dd'));
    setIsModalOpen(true);
  };

  const getDayAppointments = (day: Date) => {
    return appointments.filter(app => {
      const appDate = parseISO(app.start_time);
      return isSameDay(appDate, day) && selectedFilters.includes(app.procedure_name || "Avaliação");
    });
  };

  const toggleFilter = (name: string) => {
    setSelectedFilters(prev => 
      prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]
    );
  };

  const getProcedureStyle = (name: string) => {
    const filter = PROCEDURE_FILTERS.find(f => f.name === name);
    return filter ? filter.color : "bg-slate-100 border-slate-200 text-slate-700";
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchContactText.toLowerCase()) || 
    (c.metadata?.cpf && c.metadata.cpf.includes(searchContactText))
  );

  const handleSaveAppt = async () => {
    if (!newApptContact) {
      notify("Erro", "Selecione um paciente", "error"); return;
    }
    
    setIsSavingApp(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: uc } = await supabase.from("user_company").select("company_id").eq("user_id", user?.id).single();
      
      // Monta ISO timestamp
      const startTime = parseISO(`${newApptDate}T${newApptTime}:00`);
      // Simula uma hora de duração
      const endTime = addDays(startTime, 0); 
      endTime.setHours(startTime.getHours() + 1);

      const payload = {
        company_id: uc?.company_id,
        contact_id: newApptContact.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        procedure_name: newApptProcedure,
        status: "scheduled"
      };

      const { error } = await supabase.from("appointments").insert([payload]);
      if(error) throw error;
      
      notify("Sucesso", "Agendamento confirmado!", "success");
      setIsModalOpen(false);
      fetchAppointments();
      
    } catch(err: any){
      notify("Erro", err.message, "error");
    } finally {
      setIsSavingApp(false);
    }
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
      <div className="p-6 md:p-8 flex-1 flex flex-col max-w-7xl mx-auto w-full gap-6">
        
        {/* App Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
               <CalendarIcon size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Agenda Mensal</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Gerencie os compromissos e as avaliações clínicas com facilidade.</p>
            </div>
          </div>

          <div className="flex justify-center flex-1 w-full bg-slate-200/50 p-1.5 rounded-xl max-w-[240px] border border-slate-200 hidden md:flex">
               <button className="flex-1 text-sm font-bold text-slate-500 py-1.5 px-3 rounded-lg hover:bg-white hover:text-slate-800 transition-colors">Dia</button>
               <button className="flex-1 text-sm font-bold text-slate-500 py-1.5 px-3 rounded-lg hover:bg-white hover:text-slate-800 transition-colors">Semana</button>
               <button className="flex-1 text-sm font-bold text-slate-800 bg-white shadow-sm py-1.5 px-3 rounded-lg">Mês</button>
          </div>

          <button 
             onClick={() => {
                setNewApptDate(format(new Date(), 'yyyy-MM-dd'));
                setNewApptContact(null);
                setIsModalOpen(true);
             }}
             className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm text-sm flex items-center gap-2 self-start md:self-auto transition-transform hover:-translate-y-0.5"
          >
            <Plus size={16} /> Novo Agendamento
          </button>
        </div>

        {/* Calendar Body (Container Border-Radius Box) */}
        <div className="flex-1 flex overflow-hidden bg-white border border-slate-200 rounded-3xl shadow-sm">
          {/* Sidebar Esquerda (Filtros & Mini Cal) */}
          <div className="w-64 bg-slate-50/50 hidden lg:flex flex-col border-r border-slate-200 p-6 shrink-0 overflow-y-auto">
            {/* Filters */}
            <div className="mb-8">
              <h3 className="font-bold text-slate-800 mb-4 capitalize">Tipos de Procedimento</h3>
              <div className="space-y-3">
                {PROCEDURE_FILTERS.map((f) => {
                   const isSelected = selectedFilters.includes(f.name);
                   return (
                    <label key={f.name} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                         isSelected ? 'bg-primary border-primary' : 'bg-white border-slate-300 group-hover:border-primary/50'
                      }`}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{f.name}</span>
                    </label>
                   )
                })}
              </div>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-8" />

            {/* Mini Calendar */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 text-sm capitalize">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</h3>
                <div className="flex gap-1">
                   <button onClick={prevMonth} className="text-slate-400 hover:text-slate-700 p-1 rounded-sm"><ChevronLeft size={16} /></button>
                   <button onClick={nextMonth} className="text-slate-400 hover:text-slate-700 p-1 rounded-sm"><ChevronRight size={16} /></button>
                </div>
              </div>
              
              {/* Headers minical */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                 {['D','S','T','Q','Q','S','S'].map((n, i) => <div key={i} className="text-[10px] font-bold text-slate-400">{n}</div>)}
              </div>
              {/* Array de dias minical */}
              <div className="grid grid-cols-7 gap-1 text-center">
                 {calendarDays.map((calDay, i) => {
                    const isCurrentMonth = isSameMonth(calDay, monthStart);
                    const isToday = isSameDay(calDay, new Date());
                    
                    return (
                      <div 
                        key={i} 
                        onClick={() => handleDayClick(calDay)}
                        className={`
                           text-xs py-1 cursor-pointer rounded-full aspect-square flex items-center justify-center font-medium transition-colors
                           ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-200'}
                           ${isToday ? 'bg-primary text-white font-bold shadow-sm hover:opacity-90' : ''}
                        `}
                      >
                        {format(calDay, 'd')}
                      </div>
                    )
                 })}
              </div>
            </div>
          </div>

          {/* Calendar Main Grid (Lado Direito) */}
          <div className="flex-1 bg-white flex flex-col overflow-hidden relative">
            
            {/* Main Month View Header Controls */}
            <div className="px-6 py-4 flex items-center justify-between z-10 bg-white border-b border-slate-100">
               <h2 className="text-xl font-bold text-slate-800 capitalize">
                  {format(currentDate, "MMMM yyyy", { locale: ptBR })}
               </h2>
               <div className="flex items-center gap-2">
                  <button 
                    onClick={prevMonth}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    onClick={today}
                    className="px-4 py-1.5 text-sm font-bold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors mx-1"
                  >
                     Hoje
                  </button>
                  <button 
                    onClick={nextMonth}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
               </div>
            </div>

            <div className="flex-1 flex flex-col overflow-auto h-full min-w-[700px]">
               
               {/* Weekday Labels Row */}
               <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 shrink-0">
                 {weekDayNames.map((n, i) => (
                    <div key={i} className="py-3 px-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wide border-r border-slate-100 last:border-0 truncate">
                       {n}
                    </div>
                 ))}
               </div>

               {/* Days Grid - Flex Auto Height Rows */}
               <div className="grid grid-cols-7 flex-1 bg-white">
                 {calendarDays.map((day, i) => {
                    const apps = getDayAppointments(day);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isTodayStr = isSameDay(day, new Date());
                    
                    return (
                      <div 
                        key={i} 
                        onClick={() => handleDayClick(day)}
                        className={`
                          min-h-[140px] border-r border-b border-slate-100 p-2 pt-1 transition-colors hover:bg-slate-50 cursor-pointer
                          ${!isCurrentMonth ? 'bg-slate-50/80 opacity-60' : 'bg-white'}
                        `}
                      >
                         <div className="flex justify-between items-center mb-1.5 px-1 py-1">
                            <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                               isTodayStr ? 'bg-primary text-white shadow-sm' : 'text-slate-700'
                            }`}>
                              {format(day, 'd')}
                            </span>
                         </div>

                         {/* Event Slots */}
                         <div className="flex flex-col gap-1.5 space-y-0.5">
                            {apps.slice(0, 4).map(app => (
                              <div 
                                key={app.id} 
                                className={`
                                  text-[11px] truncate px-2 py-1.5 rounded-md border overflow-hidden
                                  ${getProcedureStyle(app.procedure_name || "Avaliação")}
                                `}
                              >
                                 <span className="font-bold opacity-60 mr-1.5 text-[10px]">{format(parseISO(app.start_time), "HH:mm")}</span> 
                                 <span className="font-semibold">{app.contacts?.name || 'Não Identificado'}</span>
                              </div>
                            ))}
                            {apps.length > 4 && (
                              <div className="text-[10px] text-slate-500 font-bold px-1.5 mt-1 hover:text-slate-800">+ {apps.length - 4} mais agendamentos</div>
                            )}
                         </div>
                      </div>
                    )
                 })}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Appointment Creation Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-800">Novo Agendamento</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                
                {/* Visual Data/Time Block */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Data Alvo</label>
                    <input 
                      type="date" 
                      value={newApptDate}
                      onChange={e => setNewApptDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-bold text-slate-700" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Horário de Início</label>
                    <input 
                      type="time" 
                      value={newApptTime}
                      onChange={e => setNewApptTime(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-bold text-slate-700" 
                    />
                  </div>
                </div>

                {/* Patient Selector */}
                <div className="relative">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Paciente (Cliente)</label>
                  {!newApptContact ? (
                     <div className="relative">
                        <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                           type="text" 
                           placeholder="Pesquisar nome ou CPF..." 
                           value={searchContactText}
                           onChange={(e) => {
                             setSearchContactText(e.target.value);
                             setIsContactDropdownOpen(true);
                           }}
                           onFocus={() => setIsContactDropdownOpen(true)}
                           className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700" 
                        />
                        
                        {/* Dropdown Options */}
                        <AnimatePresence>
                          {isContactDropdownOpen && (
                            <motion.div 
                              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              className="absolute z-50 w-full mt-2 bg-white border border-slate-200 shadow-xl rounded-xl max-h-60 overflow-y-auto"
                            >
                               {filteredContacts.length === 0 ? (
                                  <div className="p-4 text-center text-sm text-slate-500 font-medium">Nenhum paciente localizado...</div>
                               ) : (
                                  filteredContacts.map(c => (
                                     <div 
                                       key={c.id} 
                                       onClick={() => { setNewApptContact(c); setIsContactDropdownOpen(false); }}
                                       className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                                     >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">{c.name.charAt(0)}</div>
                                        <div className="overflow-hidden">
                                           <p className="font-bold text-sm text-slate-800 truncate">{c.name}</p>
                                           {c.phone && <p className="text-xs text-slate-500 truncate">{c.phone}</p>}
                                        </div>
                                     </div>
                                  ))
                               )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                     </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 border border-primary/50 bg-primary/5 rounded-xl">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">{newApptContact.name.charAt(0)}</div>
                         <div>
                            <p className="font-bold text-primary">{newApptContact.name}</p>
                            <p className="text-xs text-primary/70 font-medium">{newApptContact.phone || newApptContact.email}</p>
                         </div>
                       </div>
                       <button onClick={() => { setNewApptContact(null); setSearchContactText(""); }} className="p-2 bg-white rounded-lg shadow-sm hover:bg-red-50 text-red-500 font-bold text-xs transition-colors">Trocar</button>
                    </div>
                  )}
                </div>

                {/* Procedure Types */}
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tipo de Procedimento</label>
                   <select 
                      value={newApptProcedure}
                      onChange={e => setNewApptProcedure(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700 appearance-none"
                   >
                     {PROCEDURE_FILTERS.map(f => (
                       <option key={f.name} value={f.name}>{f.name}</option>
                     ))}
                   </select>
                </div>

              </div>
              
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                 <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancelar</button>
                 <button 
                  onClick={handleSaveAppt}
                  disabled={isSavingApp || !newApptContact}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 hover:-translate-y-0.5 disabled:opacity-50 transition-all shadow-md shadow-primary/20"
                 >
                   {isSavingApp ? <Loader2 size={18} className="animate-spin" /> : "Agendar Paciente"}
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
