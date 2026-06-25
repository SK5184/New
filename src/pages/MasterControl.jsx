// MasterControl.jsx
// MBL QMS — ERP Admin Master Control
// Two tabs: Master Data entry + Access Authorization management
// Only accessible to ERP Administration dept (Admin + Assistant Admin)

import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, serverTimestamp, query, orderBy,
  setDoc, getDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { DEPT_PERMISSIONS } from "../context/AuthContext";

// ─── Equipment master list (editable) ────────────────────────────────────────

const DEFAULT_EQUIPMENT = [
  { id:"EQ001", name:"Sysmex XN-1000",    dept:"Haematology",       type:"Analyser",    calFreq:"6 months" },
  { id:"EQ002", name:"Cobas e411",         dept:"Serology",          type:"Analyser",    calFreq:"6 months" },
  { id:"EQ003", name:"Cobas c311",         dept:"Biochemistry",      type:"Analyser",    calFreq:"6 months" },
  { id:"EQ004", name:"BD BACTEC FX40",     dept:"Microbiology",      type:"Incubator",   calFreq:"12 months" },
  { id:"EQ005", name:"Vitek 2 Compact",    dept:"Microbiology",      type:"Analyser",    calFreq:"12 months" },
  { id:"EQ006", name:"Biosafety Cabinet",  dept:"Microbiology",      type:"Safety",      calFreq:"12 months" },
  { id:"EQ007", name:"Autoclave",          dept:"Microbiology",      type:"Steriliser",  calFreq:"6 months" },
  { id:"EQ008", name:"ELISA Reader",       dept:"Serology",          type:"Analyser",    calFreq:"6 months" },
  { id:"EQ009", name:"PCR Machine",        dept:"Molecular Biology", type:"Analyser",    calFreq:"12 months" },
  { id:"EQ010", name:"Refrigerator",       dept:"All",               type:"Storage",     calFreq:"3 months" },
  { id:"EQ011", name:"Deep Freezer",       dept:"All",               type:"Storage",     calFreq:"3 months" },
  { id:"EQ012", name:"Centrifuge",         dept:"All",               type:"Equipment",   calFreq:"12 months" },
  { id:"EQ013", name:"Microscope",         dept:"All",               type:"Equipment",   calFreq:"12 months" },
  { id:"EQ014", name:"Water Bath",         dept:"All",               type:"Equipment",   calFreq:"6 months" },
  { id:"EQ015", name:"Incubator",          dept:"Microbiology",      type:"Incubator",   calFreq:"6 months" },
];

const EQUIPMENT_TYPES = ["Analyser","Incubator","Safety","Steriliser","Storage","Equipment","Instrument"];
const CAL_FREQS       = ["1 month","3 months","6 months","12 months","2 years"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.4)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:1000, padding:16,
    }}>
      <div style={{
        background:"#fff", borderRadius:14,
        width:"100%", maxWidth:520,
        maxHeight:"90vh", overflow:"auto",
        boxShadow:"0 12px 60px rgba(0,0,0,0.2)",
      }}>
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"14px 20px", borderBottom:"0.5px solid #E0DDD6",
          position:"sticky", top:0, background:"#fff", zIndex:1,
        }}>
          <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>{title}</div>
          <button onClick={onClose} style={{
            background:"none", border:"none", cursor:"pointer",
            fontSize:18, color:"#888780",
          }}>✕</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

const inp = {
  padding:"7px 10px", border:"0.5px solid #D3D1C7", borderRadius:7,
  fontSize:12, background:"#fff", color:"#2C2C2A", width:"100%", boxSizing:"border-box",
};

function Field({ label, required, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:12 }}>
      <label style={{ fontSize:11, fontWeight:500, color:"#5F5E5A" }}>
        {label}{required && <span style={{ color:"#E24B4A" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const PHLEBOTOMY_FEATURES = [
  { key: "phleb_comm_record", label: "Communication record staff-customer" },
  { key: "phleb_cont_edu", label: "Continued Education & Professional Development" },
  { key: "phleb_training_eval", label: "Evaluation of training effectiveness" },
  { key: "phleb_audit", label: "External and Internal Audits" },
  { key: "phleb_housekeeping_phleb", label: "House Keeping - Phlebotomy" },
  { key: "phleb_housekeeping_sorting", label: "House Keeping - Sample Sorting Room" },
  { key: "phleb_humidity_sorting", label: "Humidity - Sample Sorting Room" },
  { key: "phleb_error_log", label: "Error Log" },
  { key: "phleb_non_conformance", label: "Non-Conformance" },
  { key: "phleb_temp_deepfreezer", label: "Temperature - Deep Freezer" },
  { key: "phleb_room_temp", label: "Room Temperature - Phlebotomy" },
  { key: "phleb_room_temp_sorting", label: "Room Temperature - Sample Sorting Room" },
  { key: "phleb_rejection", label: "Sample Rejection - Phlebotomy" },
  { key: "phleb_rejection_sorting", label: "Sample Rejection - Sample Sorting Room" },
  { key: "phleb_sample_not_given", label: "Sample Not Given" },
  { key: "phleb_repeat_collection", label: "Sample Repeat collection" },
  { key: "phleb_collection_room1", label: "Sample Collection Form - ROOM 1" },
  { key: "phleb_collection_room2", label: "Sample Collection Form - ROOM 2" },
  { key: "phleb_comm_issues", label: "Sample Receipt - Issue Communication" },
  { key: "phleb_transport_tracking", label: "Sample Transport Tracking Record" },
  { key: "phleb_staff_suggestions", label: "Staff Suggestions" },
  { key: "phleb_inventory", label: "Inventory" },
  { key: "phleb_home_collection", label: "Home Collection Transport details" },
  { key: "phleb_transit_time", label: "Sample Transit Time Record" },
  { key: "phleb_verbal_request", label: "Verbal Request log" },
  { key: "phleb_uv_light", label: "UV light details" },
  { key: "phleb_hospital_client_details", label: "Hospital/Client Laboratory details" },
  { key: "phleb_hospital_client_pending", label: "Hospital/Client Laboratory pending list" },
];

export const RECEPTION_FEATURES = [
  { key: "recep_visitors_reg", label: "Visitors register form" },
  { key: "recep_weekly_roster", label: "Weekly Duty roster" },
  { key: "recep_advisory_services", label: "Advisory Services form" },
  { key: "recep_batch_test_schedule", label: "Batch Test Schedule for Special Test" },
  { key: "recep_communication_form", label: "Communication form (patient & staff)" },
  { key: "recep_cont_edu", label: "Continuing Education & Professional Dev" },
  { key: "recep_consent_form", label: "Consent Forms" },
  { key: "recep_deviation_parameters", label: "Deviation/Exclusion parameters log" },
  { key: "recep_training_eval", label: "Training program effectiveness evaluation" },
  { key: "recep_audit", label: "External and Internal Audits" },
  { key: "recep_housekeeping", label: "House Keeping checklist" },
  { key: "recep_new_test_details", label: "New Test Details catalogue" },
  { key: "recep_policy_manual", label: "Policy Manual" },
  { key: "recep_report_delay", label: "Report Delay Details" },
  { key: "recep_master_test_list", label: "Master Test List" },
  { key: "recep_user_requirements", label: "Reception Documents User Requirements" },
  { key: "recep_room_temp", label: "Room Temperature Log" },
  { key: "recep_test_requisition", label: "Test Requisition Form" },
  { key: "recep_verbal_request", label: "Verbal Request for Additional Tests" },
  { key: "recep_house_visit", label: "House Visit Details Form" },
];

export const HAEMATOLOGY_FEATURES = [
  { key: "haem_duty_roster", label: "Weekly Duty Roster" },
  { key: "haem_auth_matrix", label: "Responsibility & Authorization Matrix" },
  { key: "haem_critical_list", label: "Critical Test List & Reporting" },
  { key: "haem_gen_procedure", label: "General Departmental Procedure" },
  { key: "haem_iqc_procedure", label: "Internal Quality Control Procedure" },
  { key: "haem_eqa_procedure", label: "External Quality Assessment Procedure" },
  { key: "haem_lot_to_lot", label: "Lot to Lot Reagent Verification" },
  { key: "haem_ver_val", label: "Verification and Validation Reports" },
  { key: "haem_retention", label: "Retention of Records Checklist" },
  { key: "haem_sample_acceptance", label: "Sample Acceptance & Rejection Criteria" },
  { key: "haem_advisory", label: "Advisory Services Record" },
  { key: "haem_antisera", label: "Anti-sera Titer Log" },
  { key: "haem_avidity", label: "Blood Group Avidity & Affinity Evaluation" },
  { key: "haem_centrifuge", label: "Citrate Plasma Centrifuge Check" },
  { key: "haem_communication", label: "Staff-Customer Communication Log" },
  { key: "haem_comparability", label: "Comparability of Equipments & Methods" },
  { key: "haem_cont_edu", label: "Continuing Education & Professional Dev (CME)" },
  { key: "haem_outliers_eqa", label: "Corrective Action - Outliers of EQAS" },
  { key: "haem_outliers_iqc", label: "Corrective Action - Outliers of IQC" },
  { key: "haem_critical_result", label: "Critical Result Immediate Log" },
  { key: "haem_error_log", label: "Error Log Sheet" },
  { key: "haem_training_eval", label: "Evaluation of Effectiveness of Training" },
  { key: "haem_audit_eval", label: "Audit Evaluations (External & Internal)" },
  { key: "haem_eqa_aptt_pt", label: "EQAS - APTT And PT Results" },
  { key: "haem_eqa_blood_group", label: "EQAS - Blood Group/Indirect Coombs/Direct Coombs" },
  { key: "haem_eqa_cbc", label: "EQAS - Complete Blood Count/Retic/Smear" },
  { key: "haem_eqa_hb_elec", label: "EQAS - Hemoglobin Electrophoresis" },
  { key: "haem_eqa_prot_c_s", label: "EQAS - Protein C and Protein S" },
  { key: "haem_eqa_lupus", label: "EQAS - Lupus Anticoagulant" },
  { key: "haem_eqa_sickle", label: "EQAS - Sickle Test" },
  { key: "haem_housekeeping", label: "House Keeping log sheet" },
  { key: "haem_humidity", label: "Humidity & Room Temperature Log" },
  { key: "haem_iqc_acl", label: "IQC - ACL TOP Log" },
  { key: "haem_iqc_alinity", label: "IQC - Alinity HQ Log" },
  { key: "haem_iqc_atellica", label: "IQC - Atellica Log" },
  { key: "haem_iqc_grouping", label: "IQC - Blood Grouping and Rh Typing" },
  { key: "haem_iqc_cellavision", label: "IQC - Cellavision Log" },
  { key: "haem_iqc_direct_coombs", label: "IQC - Direct Coombs Log" },
  { key: "haem_iqc_esr", label: "IQC - ESR (Manual) Log" },
  { key: "haem_iqc_indirect_coombs", label: "IQC - Indirect Coombs Log" },
  { key: "haem_iqc_minicap", label: "IQC - Mini Cap Log" },
  { key: "haem_iqc_minividas", label: "IQC - Mini Vidas Log" },
  { key: "haem_iqc_sickle", label: "IQC - Sickle Cell Log" },
  { key: "haem_iqc_stago", label: "IQC - STAGO Log" },
  { key: "haem_iqc_sysmex", label: "IQC - SYSMEX XN 1000 Log" },
  { key: "haem_trend_ceveron_acl", label: "IQC Trend Analysis (Ceveron & ACL Top)" },
  { key: "haem_trend_sysmex_alinity", label: "IQC Trend Analysis (Sysmex & Alinity hq)" },
  { key: "haem_inserts_qc", label: "Kit Inserts - Quality Control Material" },
  { key: "haem_inserts_reagents", label: "Kit Inserts - Reagents" },
  { key: "haem_lot_qc", label: "Lot to Lot Verification - QC" },
  { key: "haem_lot_reagents", label: "Lot to Lot Verification - Reagents" },
  { key: "haem_lot_stain", label: "Lot to Lot Verification - Stain" },
  { key: "haem_maint_acl", label: "Machine Maintenance - ACL TOP" },
  { key: "haem_maint_alinity", label: "Machine Maintenance - Alinity hq" },
  { key: "haem_maint_cellavision", label: "Machine Maintenance - Cellavision" },
  { key: "haem_maint_ceveron", label: "Machine Maintenance - Ceveron" },
  { key: "haem_maint_mindray", label: "Machine Maintenance - Mindray" },
  { key: "haem_maint_minicap", label: "Machine Maintenance - Minicap" },
  { key: "haem_maint_stainer", label: "Machine Maintenance - Stainer" },
  { key: "haem_maint_stago", label: "Machine Maintenance - Stago" },
  { key: "haem_maint_sysmex", label: "Machine Maintenance - Sysmex XN 1000" },
  { key: "haem_mean_pt", label: "Mean Normal Prothrombin Time (Ceveron & ACL TOP)" },
  { key: "haem_non_conformance", label: "Non Conformance Log" },
  { key: "haem_recheck_coombs", label: "Rechecking - Direct Coombs Test Positive Result" },
  { key: "haem_repeat_test", label: "Repeat Test Log" },
  { key: "haem_retic_manual", label: "Reticulocyte - Manual Verification" },
  { key: "haem_revised_report", label: "Revised Report Log" },
  { key: "haem_sample_integrity", label: "Sample Integrity and Stability Check" },
  { key: "haem_sample_rejection", label: "Sample Rejection and Rework" },
  { key: "haem_sample_receiving", label: "Sample Receiving Department Log" }
];

export const CLINICAL_PATHOLOGY_FEATURES = [
  { key: "clin_duty_roster", label: "Weekly Duty Roster" },
  { key: "clin_auth_matrix", label: "Responsibility & Authorization Matrix" },
  { key: "clin_critical_list", label: "Critical Test List & Reporting" },
  { key: "clin_gen_procedure", label: "General Departmental Procedure" },
  { key: "clin_iqc_procedure", label: "Internal Quality Control Procedure" },
  { key: "clin_eqa_procedure", label: "External Quality Assessment Procedure" },
  { key: "clin_lot_to_lot", label: "Lot to Lot Reagent Verification" },
  { key: "clin_ver_val", label: "Verification and Validation Reports" },
  { key: "clin_retention", label: "Retention of Records Checklist" },
  { key: "clin_sample_acceptance", label: "Sample Acceptance & Rejection Criteria" },
  { key: "clin_advisory", label: "Advisory Services Record" },
  { key: "clin_communication", label: "Staff-Customer Communication Log" },
  { key: "clin_cont_edu", label: "Continuing Education & Professional Dev (CME)" },
  { key: "clin_outliers_eqa", label: "Corrective Action - Outliers of EQAS" },
  { key: "clin_outliers_iqc", label: "Corrective Action - Outliers of IQC" },
  { key: "clin_critical_result", label: "Critical Result Immediate Log" },
  { key: "clin_error_log", label: "Error Log Sheet" },
  { key: "clin_training_eval", label: "Evaluation of Effectiveness of Training" },
  { key: "clin_audit_eval", label: "Audit Evaluations (External & Internal)" },
  { key: "clin_housekeeping", label: "House Keeping log sheet" },
  { key: "clin_humidity", label: "Humidity & Room Temperature Log" },
  { key: "clin_iqc_atellica", label: "IQC - Atellica Log" },
  { key: "clin_iqc_esr", label: "IQC - ESR (Manual) Log" },
  { key: "clin_iqc_minicap", label: "IQC - Mini Cap Log" },
  { key: "clin_iqc_minividas", label: "IQC - Mini Vidas Log" },
  { key: "clin_inserts_qc", label: "Kit Inserts - Quality Control Material" },
  { key: "clin_inserts_reagents", label: "Kit Inserts - Reagents" },
  { key: "clin_lot_qc", label: "Lot to Lot Verification - QC" },
  { key: "clin_lot_reagents", label: "Lot to Lot Verification - Reagents" },
  { key: "clin_lot_stain", label: "Lot to Lot Verification - Stain" },
  { key: "clin_maint_minicap", label: "Machine Maintenance - Minicap" },
  { key: "clin_maint_stainer", label: "Machine Maintenance - Stainer" },
  { key: "clin_non_conformance", label: "Non Conformance Log" },
  { key: "clin_repeat_test", label: "Repeat Test Log" },
  { key: "clin_revised_report", label: "Revised Report Log" },
  { key: "clin_sample_integrity", label: "Sample Integrity and Stability Check" },
  { key: "clin_sample_rejection", label: "Sample Rejection and Rework" },
  { key: "clin_sample_receiving", label: "Sample Receiving Department Log" }
];

export const CYTOGENETICS_FEATURES = [
  { key: "cyto_duty_roster", label: "Weekly Duty Roster" },
  { key: "cyto_auth_matrix", label: "Responsibility Matrix" },
  { key: "cyto_abnormal_results", label: "Abnormal Results log" },
  { key: "cyto_advisory", label: "Advisory Services" },
  { key: "cyto_communication", label: "Communication Record" },
  { key: "cyto_consent_req", label: "Consent & Requisition" },
  { key: "cyto_cont_edu", label: "Continuing Education (CME)" },
  { key: "cyto_outliers_eqa", label: "Corrective Action - EQAS" },
  { key: "cyto_outliers_iqc", label: "Corrective Action - IQC" },
  { key: "cyto_error_log", label: "Error Log Sheet" },
  { key: "cyto_training_eval", label: "Training program evaluation" },
  { key: "cyto_eqa_log", label: "EQAS Result, Report, Corrective action" },
  { key: "cyto_eqa_sample_details", label: "EQAS Sample and Reporting details" },
  { key: "cyto_housekeeping", label: "House Keeping log" },
  { key: "cyto_humidity", label: "Humidity & Room Temperature Log" },
  { key: "cyto_iqc_data", label: "Internal Quality Control Data" },
  { key: "cyto_inter_lab", label: "Inter laboratory Comparison" },
  { key: "cyto_audit", label: "Internal & External Audits Checklist" },
  { key: "cyto_lot_verification", label: "Lot to Lot verification" },
  { key: "cyto_media_prep", label: "Media Preparation and Aliquoting" },
  { key: "cyto_surveillance", label: "Microbiological Surveillance" },
  { key: "cyto_non_conformance", label: "Non-Conformance log" },
  { key: "cyto_repeat_sample", label: "Repeat Sample Record" },
  { key: "cyto_result_image", label: "Result Report Image" },
  { key: "cyto_revised_report", label: "Revised Report Log" },
  { key: "cyto_safety_data", label: "Safety Data Sheets (SDS)" },
  { key: "cyto_sample_receiving", label: "Sample Receiving and Discarding" },
  { key: "cyto_sample_storage", label: "Storage of Slides and Cell Suspension" },
  { key: "cyto_sample_rejection", label: "Sample Rejection log" },
  { key: "cyto_split_sample", label: "Split Sample Testing" },
  { key: "cyto_sop_manual", label: "Standard Operating Procedure Manual" },
  { key: "cyto_stock", label: "Stock inventory" },
  { key: "cyto_uv_exposure", label: "UV exposure log" },
  { key: "cyto_maint_centrifuge", label: "Machine Maintenance - Centrifuge" },
  { key: "cyto_maint_hotplate", label: "Machine Maintenance - Hot Plate" },
  { key: "cyto_maint_incubator", label: "Machine Maintenance - Incubator" },
  { key: "cyto_maint_microscope_inv", label: "Maintenance - Microscope Inverted (1)" },
  { key: "cyto_maint_microscope_2", label: "Maintenance - Microscope (2)" },
  { key: "cyto_maint_microscope_3", label: "Maintenance - Microscope (3)" },
  { key: "cyto_maint_ph", label: "Maintenance - PH meter" },
  { key: "cyto_maint_safety_cabinet", label: "Maintenance - Safety Cabinet" },
  { key: "cyto_maint_water_bath", label: "Maintenance - Water Bath" },
  { key: "cyto_temp_freezer1", label: "Temperature - Freezer (1)" },
  { key: "cyto_temp_freezer2", label: "Temperature - Freezer (2)" },
  { key: "cyto_temp_ref1", label: "Temperature - Refrigerator (1)" },
  { key: "cyto_temp_ref2", label: "Temperature - Refrigerator (2)" },
  { key: "cyto_temp_room", label: "Temperature - Room" }
];

export const MICROBIOLOGY_FEATURES = [
  { key: "micro_duty_roster", label: "Weekly Duty Roster" },
  { key: "micro_auth_matrix", label: "Responsibility Matrix" },
  { key: "micro_equip_auth", label: "Equipment Authorization" },
  { key: "micro_staff_training", label: "New Staff Training" },
  { key: "micro_gen_procedure", label: "General Department Procedure" },
  { key: "micro_iqc_freq", label: "Frequency of Internal Quality Control" },
  { key: "micro_reagent_prep", label: "Reagent Preparation" },
  { key: "micro_critical_list", label: "Critical Results List" },
  { key: "micro_mlrs_vs_vitek", label: "Comparison of MLRS Vs VITEK" },
  { key: "micro_retention", label: "Retention Of Records" },
  { key: "micro_abbreviations", label: "List of Abbreviations" },
  { key: "micro_eqa_procedure", label: "External Quality Assessment Procedure" },
  { key: "micro_iqc_procedure", label: "Internal Quality Control Procedure" },
  { key: "micro_sample_criteria", label: "Sample Acceptance And Rejection" },
  { key: "micro_advisory", label: "Advisory Services" },
  { key: "micro_autoclave", label: "Autoclave – Decontamination" },
  { key: "micro_communication", label: "Communication Log" },
  { key: "micro_comparability", label: "Comparability of Equipments & Test methods" },
  { key: "micro_contamination_sheet", label: "Contamination Worksheet" },
  { key: "micro_cont_edu", label: "Continuing Education (CME)" },
  { key: "micro_outliers_eqa", label: "Corrective Action - Outliers of EQA" },
  { key: "micro_critical_result", label: "Critical Result Log" },
  { key: "micro_worklist_afb_comp", label: "C&S - AFB Worklist (Completed)" },
  { key: "micro_worklist_afb_follow", label: "C&S - AFB Worklist (Follow up)" },
  { key: "micro_worklist_afb_smear", label: "C&S - AFB Worklist (Smear)" },
  { key: "micro_worklist_blood_comp", label: "C&S - Blood Culture (Completed)" },
  { key: "micro_worklist_blood_follow", label: "C&S - Blood Culture (Follow up)" },
  { key: "micro_worklist_genexpert", label: "C&S - Gene Xpert Worklist" },
  { key: "micro_worklist_maldi", label: "C&S - MALDI Worksheet" },
  { key: "micro_worklist_myco_comp", label: "C&S - Mycology Worklist (Completed)" },
  { key: "micro_worklist_myco_follow", label: "C&S - Mycology Worklist (Follow up)" },
  { key: "micro_worklist_routine", label: "C&S - Routine Worklist" },
  { key: "micro_worklist_serology", label: "C&S - Serology Worklist" },
  { key: "micro_worklist_water_comp", label: "C&S - OR/BI/Water Worklist (Completed)" },
  { key: "micro_worklist_water_follow", label: "C&S - OR/BI/Water Worklist (Follow up)" },
  { key: "micro_error_log", label: "Error Log" },
  { key: "micro_audit_eval", label: "Audits (External & Internal)" },
  { key: "micro_eqa_genexpert", label: "EQA - Gene Xpert" },
  { key: "micro_eqa_iamm", label: "EQA - IAMM" },
  { key: "micro_eqa_inf_mono", label: "EQA - Infectious Mononucleosis" },
  { key: "micro_eqa_mycology", label: "EQA - Mycology" },
  { key: "micro_eqa_neucap", label: "EQA - Neu Cap" },
  { key: "micro_eqa_rcpa", label: "EQA - RCPA" },
  { key: "micro_hepa_filters", label: "HEPA Filter checks (AFB/AST/Myco/Routine)" },
  { key: "micro_housekeeping", label: "House Keeping Log" },
  { key: "micro_humidity", label: "Humidity & Room Temperature Log" },
  { key: "micro_iqc_antibiotic_disc", label: "IQC - Antibiotic Disc Potency" },
  { key: "micro_iqc_bactalert", label: "IQC - Bact Alert" },
  { key: "micro_iqc_corrective", label: "IQC - Corrective Action" },
  { key: "micro_iqc_culture_media", label: "IQC - Culture Media (1, 2, 3)" },
  { key: "micro_iqc_biochem_media", label: "IQC - Biochemical Media (4, 5)" },
  { key: "micro_iqc_mb_bact", label: "IQC - MB Bact Alert" },
  { key: "micro_iqc_serology", label: "IQC - Serology" },
  { key: "micro_iqc_mlrs_ast", label: "IQC - MLRS STAT AST" },
  { key: "micro_iqc_strain_follow", label: "IQC - Reference Strain follow-up" },
  { key: "micro_iqc_stains", label: "IQC - Stains (AFB/Albert/Gram)" },
  { key: "micro_iqc_assays", label: "IQC - Qualitative Assays (C. diff/GeneXpert)" },
  { key: "micro_iqc_vitek", label: "IQC - Vitek 2 Compact" },
  { key: "micro_iqc_uro4", label: "IQC - Uro 4" },
  { key: "micro_inserts", label: "Kit Inserts" },
  { key: "micro_lot_verification", label: "Lot to Lot Verification" },
  { key: "micro_maint_adagio", label: "Machine Maintenance - Adagio" },
  { key: "micro_maint_ast_stat", label: "Machine Maintenance - AST STAT" },
  { key: "micro_maint_bactalert", label: "Machine Maintenance - Bact Alert" },
  { key: "micro_maint_genexpert", label: "Machine Maintenance - Gene Xpert" },
  { key: "micro_maint_maldi", label: "Machine Maintenance - Microflex MALDI" },
  { key: "micro_maint_vitek", label: "Machine Maintenance - Vitek 2 Compact" },
  { key: "micro_maint_uro4", label: "Machine Maintenance - Uro 4" },
  { key: "micro_bsc_maintenance", label: "Maintenance - Biosafety Cabinets" },
  { key: "micro_maint_incubators", label: "Maintenance & Temp - Incubators (1-5, BOD, BugBox)" },
  { key: "micro_maint_water_bath", label: "Maintenance & Temp - Water Bath" },
  { key: "micro_maint_microscopes", label: "Maintenance - Microscopes" },
  { key: "micro_water_analysis", label: "Microbiological Analysis - Drinking Water" },
  { key: "micro_surveillance", label: "Microbiological Surveillance" },
  { key: "micro_non_conformance", label: "Non-conformance Log" },
  { key: "micro_revised_report", label: "Revised Report Log" },
  { key: "micro_safety_data", label: "Safety Data Sheets" },
  { key: "micro_sample_interdept", label: "Sample Details - Interdepartmental" },
  { key: "micro_sample_rejection", label: "Sample Rejection And Repeat Test" },
  { key: "micro_sample_receiving", label: "Sample Receiving (Dept & EQA)" },
  { key: "micro_split_sample", label: "Split Sample testing" },
  { key: "micro_stock", label: "Stock (Antibiotics & Media)" },
  { key: "micro_storage_abnormal", label: "Storage - Abnormal Samples" },
  { key: "micro_storage_strains", label: "Storage - Control Strains" },
  { key: "micro_temp_freezer", label: "Temperature - Freezer" },
  { key: "micro_temp_refrigerator", label: "Temperature - Refrigerator (1-4)" },
  { key: "micro_temp_room", label: "Temperature - Room" },
  { key: "micro_uv_exposure", label: "UV exposure log" }
];

export const SEROLOGY_FEATURES = [
  { key: "ser_duty_roster", label: "Weekly Duty Roster" },
  { key: "ser_advisory", label: "Advisory Services" },
  { key: "ser_comparability", label: "Comparability of Test Methods & Equipments" },
  { key: "ser_communication", label: "Communication Log" },
  { key: "ser_cont_edu", label: "Continuing Education & Training Evaluation" },
  { key: "ser_outliers_eqa", label: "Corrective Action - EQA Outliers" },
  { key: "ser_outliers_iqc", label: "Corrective Action - IQC Outliers" },
  { key: "ser_critical_result", label: "Critical Result Log" },
  { key: "ser_daily_alinity1", label: "Daily Results - Alinity CI 1" },
  { key: "ser_daily_alinity2", label: "Daily Results - Alinity CI 2" },
  { key: "ser_daily_ana_if", label: "Daily Result - ANA IF" },
  { key: "ser_daily_anca", label: "Daily Result - ANCA Profile" },
  { key: "ser_daily_atellica", label: "Daily Results - Atellica NEPH 630" },
  { key: "ser_daily_autolumo", label: "Daily Result - Autolumo A1000" },
  { key: "ser_daily_ena25", label: "Daily Result - ENA 25 Profile" },
  { key: "ser_daily_euroimmun", label: "Daily Result - Euroimmun (ELISA)" },
  { key: "ser_daily_hcv_line", label: "Daily Results - HCV Line Immuno Assay" },
  { key: "ser_daily_hiv_line", label: "Daily Result - HIV Line Immuno Assay" },
  { key: "ser_daily_liaison", label: "Daily Result - Liaison & Liaison XL" },
  { key: "ser_daily_maglumi", label: "Daily Result - Maglumi" },
  { key: "ser_daily_elisa", label: "Daily Result - Manual ELISA" },
  { key: "ser_daily_phadia", label: "Daily Result - Phadia 250" },
  { key: "ser_daily_vidas", label: "Daily Result - Vidas" },
  { key: "ser_error_log", label: "Error Log" },
  { key: "ser_audit_eval", label: "Evaluations - External And Internal Audit" },
  { key: "ser_eqa_viral", label: "EQAS - Viral Markers HIV/Hepatitis" },
  { key: "ser_eqa_torch", label: "EQAS - Torch/EBV/Mumps" },
  { key: "ser_eqa_phospholipids", label: "EQAS - Anti phospholipids antibody" },
  { key: "ser_eqa_coagulation", label: "EQAS - Coagulation Extended" },
  { key: "ser_eqa_immunology", label: "EQAS - Diagnostic Immunology" },
  { key: "ser_eqa_hepatic", label: "EQAS - Gastrointestinal & Hepatic" },
  { key: "ser_eqa_rheumatic", label: "EQAS - Rheumatic Disease Serology" },
  { key: "ser_eqa_sarscov2", label: "EQAS - SARS-CoV-2 Serology" },
  { key: "ser_eqa_special_imm", label: "EQAS - Special Immunology" },
  { key: "ser_eqa_cmc_viro", label: "EQAS - CMC VIRO" },
  { key: "ser_eqa_neu_qap", label: "EQAS - NEU-QAP" },
  { key: "ser_eqa_rcpa_dengue", label: "EQAS - RCPA Dengue Virus" },
  { key: "ser_eqa_rcpa_herpes", label: "EQAS - RCPA Herpes Simplex virus" },
  { key: "ser_eqa_split_sample", label: "EQAS - Split Sample Testing" },
  { key: "ser_eqa_inter_lab", label: "EQAS - Inter Lab Comparison" },
  { key: "ser_iqc_alinity1", label: "IQC Log - Alinity CI 1 (AM/PM)" },
  { key: "ser_iqc_alinity2", label: "IQC Log - Alinity CI 2 (AM/PM)" },
  { key: "ser_iqc_atellica", label: "IQC Log - Atellica NEPH 630" },
  { key: "ser_iqc_autolumo", label: "IQC Log - Autolumo A1000" },
  { key: "ser_iqc_elisa", label: "IQC Log - ELISA Result" },
  { key: "ser_iqc_immage800", label: "IQC Log - Immage 800" },
  { key: "ser_iqc_liaison", label: "IQC Log - Liaison & Liaison XL" },
  { key: "ser_iqc_maglumi", label: "IQC Log - Maglumi 800" },
  { key: "ser_iqc_phadia", label: "IQC Log - Phadia 250" },
  { key: "ser_iqc_vidas", label: "IQC Log - Vidas" },
  { key: "ser_inserts", label: "Kit Inserts - Scope wise" },
  { key: "ser_lot_verification", label: "Lot-to-Lot Verification" },
  { key: "ser_maint_autolumo", label: "Machine Maintenance - Autolumo A1000" },
  { key: "ser_maint_commander", label: "Machine Maintenance - Commander" },
  { key: "ser_maint_dtek", label: "Machine Maintenance - D-Tek" },
  { key: "ser_maint_euroimmun", label: "Machine Maintenance - Euroimmun Analyzer" },
  { key: "ser_maint_fluoromat", label: "Machine Maintenance - FluoroMAT250" },
  { key: "ser_maint_liaison", label: "Machine Maintenance - Liaison & Liaison XL" },
  { key: "ser_maint_reader", label: "Machine Maintenance - Micro Plate Reader" },
  { key: "ser_maint_phadia", label: "Machine Maintenance - Phadia" },
  { key: "ser_non_conformance", label: "Non-Conformance Log" },
  { key: "ser_repeat_test", label: "Repeat Test Log" },
  { key: "ser_revised_report", label: "Revised Report Log" },
  { key: "ser_sample_rejection", label: "Sample Rejection Log" },
  { key: "ser_staff_suggestion", label: "Staff Suggestion Log" },
  { key: "ser_sop", label: "Standard Operating Procedure" },
  { key: "ser_temp_refrigerator", label: "Temperature - Refrigerator" },
  { key: "ser_cal_alinity1", label: "Test Calibration - Alinity CI 1" },
  { key: "ser_cal_alinity2", label: "Test Calibration - Alinity CI 2" },
  { key: "ser_cal_atellica", label: "Test Calibration - Atellica NEPH 630" },
  { key: "ser_cal_autolumo", label: "Test Calibration - Autolumo A1000" },
  { key: "ser_cal_immage", label: "Test Calibration - Immage 800" },
  { key: "ser_cal_liaison", label: "Test Calibration - Liaison & Liaison XL" },
  { key: "ser_cal_maglumi", label: "Test Calibration - Maglumi 800" },
  { key: "ser_cal_phadia", label: "Test Calibration - Phadia 250" },
  { key: "ser_cal_vidas", label: "Test Calibration - MiniVidas" },
  { key: "ser_handover", label: "Work Hand Over Register" }
];

export const HISTOPATHOLOGY_FEATURES = [
  { key: "histo_duty_roster", label: "Weekly Duty Roster" },
  { key: "histo_comp_pathologist", label: "Comparison Test - Pathologist" },
  { key: "histo_comp_technicians", label: "Comparison Test - Technicians" },
  { key: "histo_consent_fna", label: "Consent - Fine Needle Aspiration" },
  { key: "histo_critical_result", label: "Critical Result Log" },
  { key: "histo_daily_worklist", label: "Daily Work List" },
  { key: "histo_outliers_eqa", label: "Corrective Action - EQAS Outliers" },
  { key: "histo_outliers_iqc", label: "Corrective Action - IQC Outliers" },
  { key: "histo_error_log", label: "Error Log" },
  { key: "histo_eqa_log", label: "External Quality Assessment (EQA) Log" },
  { key: "histo_iqc_glass", label: "IQC Log - Glass Slides" },
  { key: "histo_iqc_chemicals", label: "IQC Log - Chemicals" },
  { key: "histo_iqc_microscopy", label: "IQC Log - Microscopy" },
  { key: "histo_iqc_stains", label: "IQC Log - Stains" },
  { key: "histo_maint_uprep", label: "Machine Maintenance - Uprep" },
  { key: "histo_non_conformance", label: "Non-Conformance Log" },
  { key: "histo_sample_receiving_eqa", label: "Sample Receiving – EQA" },
  { key: "histo_sample_receiving_dept", label: "Sample Receiving & Discarding" },
  { key: "histo_slide_position", label: "Slide Position Log" },
  { key: "histo_test_requisition", label: "Test Requisition Log" },
  { key: "histo_advisory", label: "Advisory Services" },
  { key: "histo_communication", label: "Communication Log" },
  { key: "histo_cont_edu", label: "Continuing Education & CME" },
  { key: "histo_training_eval", label: "Training Effectiveness Evaluation" },
  { key: "histo_audit_eval", label: "Audit Evaluations (Internal & External)" },
  { key: "histo_formalin_ph", label: "Formalin pH monitoring" },
  { key: "histo_correlation", label: "Histology-Cytology Correlation" },
  { key: "histo_housekeeping", label: "House Keeping Log" },
  { key: "histo_humidity", label: "Humidity & Room Temperature Log" }
];

export const FLOW_CYTOMETRY_FEATURES = [
  { key: "flow_duty_roster", label: "Weekly Duty Roster" },
  { key: "flow_advisory", label: "Advisory Services" },
  { key: "flow_communication", label: "Communication Log" },
  { key: "flow_cont_edu", label: "Continuing Education & Training Evaluation" },
  { key: "flow_outliers_eqa", label: "Corrective Action - EQA Outliers" },
  { key: "flow_outliers_iqc", label: "Corrective Action - IQC Outliers" },
  { key: "flow_daily_cd", label: "Daily Result - CD3/CD4/CD8/CD19/CD20" },
  { key: "flow_daily_hlab27", label: "Daily Result - HLAB27" },
  { key: "flow_error_log", label: "Error Log" },
  { key: "flow_audit_eval", label: "Evaluation - External and Internal Audit" },
  { key: "flow_eqa_cd", label: "EQAS Result, Report, Corrective (CD3/CD4/CD8/CD19/CD20)" },
  { key: "flow_iqc_cd", label: "IQC Results (CD3/CD4/CD8/CD19/CD20)" },
  { key: "flow_iqc_hlab27", label: "IQC Result (HLAB27)" },
  { key: "flow_iqc_lj", label: "IQC - LJ Chart" },
  { key: "flow_iqc_equip_lj", label: "IQC - Equipment LJ Chart" },
  { key: "flow_iqc_trend", label: "IQC - Trend Analysis" },
  { key: "flow_inter_lab", label: "Inter laboratory Comparison" },
  { key: "flow_inserts_qc", label: "Kit Insert - Quality Control Material" },
  { key: "flow_inserts_reagents", label: "Kit Insert - Reagents" },
  { key: "flow_lot_reagents", label: "Lot to Lot verification - Reagents" },
  { key: "flow_maint", label: "Machine Maintenance" },
  { key: "flow_non_conformance", label: "Non-Conformance Log" },
  { key: "flow_repeat_sample", label: "Repeat Sample Log" },
  { key: "flow_revised_report", label: "Revised Report Log" },
  { key: "flow_sample_rejection", label: "Sample Rejection Log" },
  { key: "flow_suggestions", label: "Staff Suggestions Log" },
  { key: "flow_stock", label: "Stock Inventory" },
  { key: "flow_temp_refrigerator", label: "Temperature - Refrigerator" },
  { key: "flow_sop", label: "Standard Operating Procedure Manual" },
  { key: "flow_sample_handling", label: "Sample Receiving, Storage & Discarding" }
];

export const MAINTENANCE_FEATURES = [
  { key: "maint_duty_roster", label: "Weekly Duty Roster" },
  { key: "maint_sop_title_page", label: "SOP - Title Page" },
  { key: "maint_sop_auth", label: "SOP - Release Authorization" },
  { key: "maint_sop_amendment", label: "SOP - Amendment Record Sheet" },
  { key: "maint_sop_acknowledgement", label: "SOP - Acknowledgement Record Sheet" },
  { key: "maint_sop_ups", label: "SOP - Uninterrupted Power Supply (UPS)" },
  { key: "maint_sop_genset", label: "SOP - Genset" },
  { key: "maint_sop_duties", label: "SOP - Duties & Responsibilities of Personnel" },
  { key: "maint_log_ac_central1", label: "AC Centralized Unit 1 - Ground & First Floor" },
  { key: "maint_log_ac_central2", label: "AC Centralized Unit 2 - Ground & First Floor" },
  { key: "maint_log_ro", label: "Reverse Osmosis (RO) Log" },
  { key: "maint_log_vertical_garden", label: "Vertical Garden Maintenance" },
  { key: "maint_log_high_dust", label: "High Dust Log" },
  { key: "maint_log_ups_room", label: "UPS Room Checklist" },
  { key: "maint_log_lift", label: "Lift Log" },
  { key: "maint_log_power_monitoring", label: "Power Supply Monitoring" },
  { key: "maint_log_genset1", label: "Genset 1 Volvo Penta 250 KVA" },
  { key: "maint_log_genset2", label: "Genset 2 Volvo Penta 250 KVA" },
  { key: "maint_log_misc_ro", label: "RO, Demineralized, Boiler, Solar Heater" },
  { key: "maint_log_genset2_copper1", label: "Genset 2 (Copper 125 KVA) - 011" },
  { key: "maint_log_genset2_copper2", label: "Genset 2 (Copper 125 KVA) - 012" },
  { key: "maint_log_uv_gf", label: "UV Exposure Monitoring - Ground Floor" },
  { key: "maint_log_reception_plant", label: "Reception Plant Maintenance" },
  { key: "maint_log_uv_ff", label: "UV Exposure Monitoring - First Floor" },
  { key: "maint_log_lpg", label: "LPG Log" },
  { key: "maint_log_ac_room1", label: "Centralized AC (ROOM 1)" },
  { key: "maint_log_action_request", label: "Action Request Form" },
  { key: "maint_log_ac_room2", label: "Centralized AC (ROOM 2)" },
  { key: "maint_log_ups_maintenance", label: "UPS Maintenance Log" },
  { key: "maint_log_ups_reading", label: "UPS Reading Log" },
  { key: "maint_log_ac_10ton", label: "Centralized AC 10 Ton - Reception" },
  { key: "maint_log_tank_overhead", label: "Tank Cleaning - Overhead" },
  { key: "maint_log_tank_underground", label: "Tank Cleaning - Underground" },
  { key: "maint_log_tank_ro", label: "Tank Cleaning - RO" },
  { key: "maint_log_tank_deionized", label: "Tank Cleaning - Deionized" },
  { key: "maint_log_fire_extinguisher", label: "Fire Extinguisher Checklist" }
];

export const HOUSEKEEPING_FEATURES = [
  { key: "hk_duty_roster", label: "Weekly Duty Roster" },
  { key: "hk_auth_matrix", label: "Authorisation Matrix" },
  { key: "hk_restroom_tissue_soap", label: "Rest Room – Tissue And Soap checking" },
  { key: "hk_restroom_towel", label: "Rest Room – Towel Change" },
  { key: "hk_restroom_vip1", label: "Rest Room - VIP ROOM 1" },
  { key: "hk_restroom_gents", label: "Rest Room – 2 - GENTS" },
  { key: "hk_restroom_ladies", label: "Rest Room – 3 - LADIES" },
  { key: "hk_restroom_male_staff", label: "Rest Room 4 – Male Staff" },
  { key: "hk_restroom_female_staff", label: "Rest Room 5 – Female Staff" },
  { key: "hk_restroom_doctor", label: "Rest Room 6 – Doctor, 3rd floor" },
  { key: "hk_restroom_md", label: "Rest Room 7 – MD Cabin" },
  { key: "hk_restroom_common", label: "Rest Room 8 - Common" },
  { key: "hk_sodium_hypo_refill", label: "Sodium hypochlorite refilling" },
  { key: "hk_shoe_cleaner", label: "Shoe Cleaner" },
  { key: "hk_play_zone", label: "Play Zone" },
  { key: "hk_coffee_machine", label: "Coffee Machine" },
  { key: "hk_water_container4", label: "Drinking Water – container 4" },
  { key: "hk_water_container3", label: "Drinking Water – container 3" },
  { key: "hk_water_container2", label: "Drinking Water – container 2" },
  { key: "hk_water_container1", label: "Drinking Water – container 1" },
  { key: "hk_daily_cleaning", label: "Daily cleaning, mopping, waste removal" },
  { key: "hk_air_curtain", label: "Air Curtain" },
  { key: "hk_kitchen_cleaning", label: "Kitchen Cleaning" },
  { key: "hk_patient_food", label: "Patient Food Supply Area Cleaning" },
  { key: "hk_sodium_hypo_reconstitute", label: "Sodium Hypochlorite Reconstitution" },
  { key: "hk_stock_misc", label: "Stock – Miscellaneous items" },
  { key: "hk_waste_dispatch", label: "Waste Dispatch record" }
];

export const IT_FEATURES = [
  { key: "it_action_request", label: "Action Request" },
  { key: "it_daily_lis_monitoring", label: "Daily Activity Monitoring LIS" },
  { key: "it_lims_integrity", label: "Data & Information Integrity Monitoring of LIMS" },
  { key: "it_audit_eval", label: "Evaluations - Audit - External & Internal" },
  { key: "it_nabl_symbol_verification", label: "NABL Symbol Verification" },
  { key: "it_email_monitoring", label: "Online Service Monitoring Log for Email" },
  { key: "it_qrcode_monitoring", label: "Online Service Monitoring Log for QR Code" },
  { key: "it_offsite_backup", label: "Offsite Backup Monitoring" },
  { key: "it_tampering_loss_safeguard", label: "Safeguard Against Tampering & Loss" },
  { key: "it_sop", label: "Standard Operating Procedure" },
  { key: "it_system_maintenance", label: "System Maintenance" },
  { key: "it_system_location_schedule", label: "System Location List & Maintenance Schedule" },
  { key: "it_system_failure_corrective", label: "System Failure & Corrective Action" },
  { key: "it_transcription_interface_error", label: "Transcription & Interface Error Monitoring" },
  { key: "it_unauthorized_access", label: "Un-authorised Access Monitoring" },
  { key: "it_verification_validation", label: "Verification and Validation" },
  { key: "it_continual_education", label: "Continual Education & Professional Development" }
];

export const BACKOFFICE_FEATURES = [
  { key: "bo_duty_roster", label: "Weekly Duty Roster" },
  { key: "bo_sample_receiving", label: "Sample Receiving" },
  { key: "bo_sorting_distribution", label: "Sorting & Distribution" },
  { key: "bo_transit_time_outliers", label: "Sample Transit Time Outliers" },
  { key: "bo_communication_issues", label: "Communication Issues" },
  { key: "bo_inventory", label: "Inventory management" },
  { key: "bo_housekeeping", label: "Housekeeping Log" },
  { key: "bo_temp_transport", label: "Transport Temperature Monitoring" },
  { key: "bo_non_conformance", label: "Non-Conformance" },
  { key: "bo_verbal_request", label: "Verbal Request Log" }
];

export const ADMINISTRATION_FEATURES = [
  { key: "admin_executive_summary", label: "Executive Summary" },
  { key: "admin_scientific_ops", label: "Scientific Operations & Advisory" },
  { key: "admin_risk_management", label: "Risk Management & Register" },
  { key: "admin_improvement_opportunities", label: "Opportunities for Improvement (OFI)" },
  { key: "admin_director_reviews", label: "Director's Review Minutes" },
  { key: "admin_access_control_view", label: "System Access Review" }
];

export const BIOCHEMISTRY_FEATURES = [
  // General & Personnel
  { key: "biochem_duty_roster", label: "Weekly Duty Roster" },
  { key: "biochem_auth_matrix", label: "Responsibility & Authorization Matrix" },
  { key: "biochem_cont_edu", label: "Continued Education & Professional Development (CPD/CME)" },
  { key: "biochem_training_eval", label: "Evaluation of Effectiveness of Training" },
  { key: "biochem_staff_suggestions", label: "Staff Suggestions Form" },
  { key: "biochem_meeting_form", label: "Intra-Departmental Meeting Form" },

  // Pre-Examination & Process
  { key: "biochem_sample_integrity", label: "Sample Integrity and Stability Check Form" },
  { key: "biochem_sample_rejection", label: "Sample Rejection Form (Quality KPI)" },
  { key: "biochem_sample_retention", label: "Sample Storage and Discarding (Retention Policy)" },
  { key: "biochem_deionized_water", label: "Deionized Water - Quality Check Form" },
  { key: "biochem_humidity", label: "Humidity Log" },
  { key: "biochem_periodic_temp", label: "Create Periodic Temperature Form" },
  { key: "biochem_temp_freezer1", label: "Temperature - Freezer (1)" },
  { key: "biochem_temp_freezer2", label: "Temperature - Freezer (2)" },
  { key: "biochem_temp_ref1", label: "Temperature - Refrigerator (1)" },
  { key: "biochem_temp_ref2", label: "Temperature - Refrigerator (2)" },
  { key: "biochem_temp_ref3", label: "Temperature - Refrigerator (3)" },
  { key: "biochem_temp_ref4", label: "Temperature - Refrigerator (4)" },
  { key: "biochem_temp_ref5", label: "Temperature - Refrigerator (5)" },
  { key: "biochem_temp_room", label: "Temperature - Room" },
  { key: "biochem_work_handover", label: "Pending Work Handover Log" },
  { key: "biochem_housekeeping_conn", label: "House Keeping connection (Housekeeping Dept)" },

  // Examination Protocols
  { key: "biochem_advisory", label: "Advisory Services - Form as per ISO requirements" },
  { key: "biochem_performance_specs", label: "Performance Specifications" },
  { key: "biochem_reagent_calib", label: "Reagent Calibration Module" },
  { key: "biochem_error_records", label: "Error Records" },
  { key: "biochem_quality_indicators", label: "Quality Indicators - Analytic and Post-analytic Errors" },
  { key: "biochem_revised_report", label: "Revised Report Log" },

  // Internal Quality Control (IQC)
  { key: "biochem_iqc_cockpit", label: "IQC Cockpit Integration" },
  { key: "biochem_iqc_analysis", label: "IQC Analysis Dashboard" },
  { key: "biochem_trend_shift_iqc", label: "Trend and Shift Analysis - IQC" },
  { key: "biochem_qc_reconstitution", label: "Quality Control Material - Reconstitution Log" },
  { key: "biochem_lot_to_lot", label: "Lot to Lot Module (Equipment/Test Masters)" },
  { key: "biochem_lot_qc_material", label: "Lot to Lot Verification - QC Material" },
  { key: "biochem_corrective_iqc", label: "Corrective Action(s) - IQC with Evidence Attachment" },
  
  // 24 Machine IQC Logs
  { key: "biochem_iqc_log_access2", label: "IQC Result Log - Access 2 (AM/PM)" },
  { key: "biochem_iqc_log_acl_acustar", label: "IQC Result Log - ACL Acustar" },
  { key: "biochem_iqc_log_agilent", label: "IQC Result Log - Agilent" },
  { key: "biochem_iqc_log_alinity_ci1_am", label: "IQC Result Log - Alinity CI (1) AM" },
  { key: "biochem_iqc_log_alinity_ci1_pm", label: "IQC Result Log - Alinity CI (1) PM" },
  { key: "biochem_iqc_log_alinity_ci2_am", label: "IQC Result Log - Alinity CI (2) AM" },
  { key: "biochem_iqc_log_alinity_ci2_pm", label: "IQC Result Log - Alinity CI (2) PM" },
  { key: "biochem_iqc_log_atellica_neph630", label: "IQC Result Log - Atellica NEPH 630 (AM/PM)" },
  { key: "biochem_iqc_log_avl", label: "IQC Result Log - AVL" },
  { key: "biochem_iqc_log_cobas6000", label: "IQC Result Log - Cobas 6000 (AM/PM)" },
  { key: "biochem_iqc_log_iflash", label: "IQC Result Log - i Flash" },
  { key: "biochem_iqc_log_kryptor_compact", label: "IQC Result Log - Kryptor Compact" },
  { key: "biochem_iqc_log_maglumi800", label: "IQC Result Log - Maglumi 800" },
  { key: "biochem_iqc_log_minicap_pepp", label: "IQC Result Log - Minicap (protein EPP)" },
  { key: "biochem_iqc_log_minicap_ifepp", label: "IQC Result Log - Minicap (IFEPP)" },
  { key: "biochem_iqc_log_minividas", label: "IQC Result Log - Mini Vidas" },
  { key: "biochem_iqc_log_osmometer", label: "IQC Result Log - Osmometer" },
  { key: "biochem_iqc_log_secomam", label: "IQC Result Log - Secomam" },
  { key: "biochem_iqc_log_shimadzu", label: "IQC Result Log - Shimadzu (HPLC)" },
  { key: "biochem_iqc_log_tosoh_g8_g11", label: "IQC Result Log - Tosoh G8/G11 (AM/PM)" },
  { key: "biochem_iqc_log_v8_nexus_pepp", label: "IQC Result Log - V8 Nexus Helena (PEPP)" },
  { key: "biochem_iqc_log_v8_nexus_ifepp", label: "IQC Result Log - V8 Nexus Helena (IFEPP)" },

  // 12 Calibration & Lot-to-Lot Verification Machine logs
  { key: "biochem_cal_lot_acl_acustar", label: "Calibration & Lot Verification - ACL Acustar" },
  { key: "biochem_cal_lot_agilent", label: "Calibration & Lot Verification - Agilent" },
  { key: "biochem_cal_lot_alinity_c1_1", label: "Calibration & Lot Verification - Alinity C1 (1)" },
  { key: "biochem_cal_lot_alinity_ci_2", label: "Calibration & Lot Verification - Alinity CI (2)" },
  { key: "biochem_cal_lot_atellica_neph630", label: "Calibration & Lot Verification - Atellica NEPH 630" },
  { key: "biochem_cal_lot_cobas6000", label: "Calibration & Lot Verification - Cobas 6000" },
  { key: "biochem_cal_lot_iflash", label: "Calibration & Lot Verification - i Flash" },
  { key: "biochem_cal_lot_kryptor_compact", label: "Calibration & Lot Verification - Kryptor Compact" },
  { key: "biochem_cal_lot_maglumi800", label: "Calibration & Lot Verification - Maglumi 800" },
  { key: "biochem_cal_lot_minividas", label: "Calibration & Lot Verification - Mini Vidas" },
  { key: "biochem_cal_lot_shimadzu", label: "Calibration & Lot Verification - Shimadzu (HPLC)" },
  { key: "biochem_cal_lot_tosoh_g8_g11", label: "Calibration & Lot Verification - Tosoh G8 and G11" },

  // External Quality Assessment (EQAS)
  { key: "biochem_eqa_program", label: "EQAS program integrated with EQAS Console" },
  { key: "biochem_eqa_sample_details", label: "External Quality Assessment Sample Details" },
  { key: "biochem_trend_shift_eqa", label: "Trend and Shift Analysis - EQA" },
  { key: "biochem_corrective_eqa", label: "Corrective Action(s) - EQA with Evidence Attachment" },
  { key: "biochem_eqa_alternative", label: "Alternative to EQA (Interlaboratory Comparison/Split Sample)" },

  // 18 EQAS Program Logs
  { key: "biochem_eqa_biorad_clinchem", label: "EQA - BIORAD - Clinical Chemistry" },
  { key: "biochem_eqa_biorad_cardiac", label: "EQA - BIORAD - Cardiac Marker" },
  { key: "biochem_eqa_biorad_ethanol", label: "EQA - BIORAD - Ethanol/Ammonia" },
  { key: "biochem_eqa_biorad_hemo", label: "EQA - BIORAD – Hemoglobin" },
  { key: "biochem_eqa_biorad_immuno", label: "EQA - BIORAD – ImmunoAssay" },
  { key: "biochem_eqa_biorad_urine", label: "EQA - BIORAD - Urine Chemistry" },
  { key: "biochem_eqa_cap_cystatin", label: "EQA - CAP – CYSTATIN" },
  { key: "biochem_eqa_cap_electro", label: "EQA - CAP – Electrophoresis" },
  { key: "biochem_eqa_cap_immuno_diag", label: "EQA - CAP – Immunology – Diagnostic" },
  { key: "biochem_eqa_cap_immuno_spec", label: "EQA - CAP – Immunology – Special" },
  { key: "biochem_eqa_cap_maternal", label: "EQA - CAP - Maternal Screen" },
  { key: "biochem_eqa_cap_pct", label: "EQA - CAP – PCT" },
  { key: "biochem_eqa_cap_flc", label: "EQA - CAP - Serum FLC" },
  { key: "biochem_eqa_neuqap_spec", label: "EQA - NEUQAP – Special Chemistry" },
  { key: "biochem_eqa_rcpa_endocrine", label: "EQA - RCPA QAP - Endocrine" },
  { key: "biochem_eqa_rcpa_g6pd", label: "EQA - RCPA QAP - G6PD" },
  { key: "biochem_eqa_rcpa_immuno", label: "EQA - RCPA QAP - Immunosuppressant" },
  { key: "biochem_eqa_rcpa_lipids", label: "EQA - RCPA QAP - Special Lipids" },

  // Equipment & Maintenance
  { key: "biochem_equip_calib", label: "Equipment Calibration Status Screen" },
  { key: "biochem_comparability", label: "Comparability of Equipments and Test Methods" },
  { key: "biochem_maint_module", label: "Maintenance Module (Extracts from Company Site)" },
  { key: "biochem_eval_external_audit", label: "Evaluation - External Audit (NABL Data Extraction)" },
  { key: "biochem_eval_internal_audit", label: "Evaluation - Internal Audit" },
  { key: "biochem_kit_inserts", label: "Kit Inserts Storage Module (Calibrator/QC/Reagents)" },

  // 20 Machine Maintenance logs
  { key: "biochem_maint_access2", label: "Machine Maintenance - Access 2" },
  { key: "biochem_maint_acl_acustar", label: "Machine Maintenance - ACL Acustar" },
  { key: "biochem_maint_agilent1260", label: "Machine Maintenance - Agilent 1260 Infinity" },
  { key: "biochem_maint_alinity1", label: "Machine Maintenance – Alinity CI (1)" },
  { key: "biochem_maint_alinity2", label: "Machine Maintenance – Alinity CI (2)" },
  { key: "biochem_maint_atellica", label: "Machine Maintenance - Atellica NEPH" },
  { key: "biochem_maint_avl", label: "Machine Maintenance - AVL" },
  { key: "biochem_maint_centrifuge", label: "Machine Maintenance - Centrifuge" },
  { key: "biochem_maint_cobas6000", label: "Machine Maintenance - COBAS 6000" },
  { key: "biochem_maint_iflash", label: "Machine Maintenance - i Flash" },
  { key: "biochem_maint_kryptor", label: "Machine Maintenance – Kryptor" },
  { key: "biochem_maint_maglumi800", label: "Machine Maintenance - Maglumi 800" },
  { key: "biochem_maint_minicap", label: "Machine Maintenance - Minicap" },
  { key: "biochem_maint_minividas", label: "Machine Maintenance - Minividas" },
  { key: "biochem_maint_osmometer", label: "Machine Maintenance - Osmometer" },
  { key: "biochem_maint_secomam", label: "Machine Maintenance - Secomam" },
  { key: "biochem_maint_shimadzu", label: "Machine Maintenance - Shimadzu Prominence iLC" },
  { key: "biochem_maint_tosoh_g8", label: "Machine Maintenance - Tosoh G8" },
  { key: "biochem_maint_tosoh_g11", label: "Machine Maintenance - Tosoh G11" },
  { key: "biochem_maint_v8_nexus", label: "Machine Maintenance - V8 Nexus Helena" }
];

export const MOL_BIOLOGY_FEATURES = [
  { key: "molbio_room_temp", label: "Room Temperature & Humidity Log" },
  { key: "molbio_pcr_runs", label: "PCR Run Log Register" },
  { key: "molbio_iqc_gel", label: "IQC Gel Electrophoresis Logs" },
  { key: "molbio_eqa_pt", label: "Proficiency Testing EQAS Reports" },
  { key: "molbio_bsc_maint", label: "Biosafety Cabinet Performance" },
  { key: "molbio_decontamination", label: "Daily Area Decontamination" },
  { key: "molbio_reagent_lot", label: "Lot-to-Lot Reagent Validation" }
];

export const MOL_GENETICS_FEATURES = [
  { key: "molgen_room_temp", label: "Room Temperature & Humidity Log" },
  { key: "molgen_sequencer_run", label: "DNA Sequencer Run Log Register" },
  { key: "molgen_iqc_karyotype", label: "IQC Karyotype Analysis Logs" },
  { key: "molgen_eqa_pt", label: "Genomics EQAS Reports" },
  { key: "molgen_maint_sequencer", label: "Sequencer Preventive Maintenance" }
];

export const QUALITY_FEATURES = [
  { key: "qual_audit_internal", label: "Internal Audits Scheduler" },
  { key: "qual_audit_external", label: "External Assessments & NABL logs" },
  { key: "qual_ncr_register", label: "Non-Conformance Records (NCR)" },
  { key: "qual_capa_register", label: "Corrective & Preventive Action (CAPA)" },
  { key: "qual_risk_matrix", label: "Risk Register & 5x5 Matrix" },
  { key: "qual_sop_master", label: "SOP Document Control Center" },
  { key: "qual_mrm_meeting", label: "Management Review Meetings Minutes" },
  { key: "qual_complaints_log", label: "Customer Complaints & Resolution" }
];

export const HR_FEATURES = [
  { key: "hr_employee_db", label: "Employee Master Registry" },
  { key: "hr_competency_review", label: "Competency Evaluations & Matrix" },
  { key: "hr_training_records", label: "Training Program & Effectiveness Logs" },
  { key: "hr_continuing_edu", label: "Continuing Education (CPD/CME Points)" },
  { key: "hr_personnel_files", label: "Mandatory Personnel Files Checklist" },
  { key: "hr_duty_roster", label: "Weekly Duty Roster planner" }
];

export const BIOMEDICAL_FEATURES = [
  { key: "biomed_breakdowns", label: "Equipment Breakdown Requests Workflow" },
  { key: "biomed_calibrations", label: "Equipment Calibrations Registry" },
  { key: "biomed_pm_schedules", label: "Preventive Maintenance (PM) logs" },
  { key: "biomed_equipment_list", label: "Equipment Master Database" },
  { key: "biomed_manuals", label: "Equipment Manuals & IFUs Library" },
  { key: "biomed_training_auth", label: "Equipment Operator Training Logs" },
  { key: "biomed_decommission", label: "Equipment Decommission & Recalls" }
];

export const PURCHASE_FEATURES = [
  { key: "pur_requisitions", label: "Purchase Requests & Requisitions" },
  { key: "pur_orders", label: "Purchase Orders (PO) Generation" },
  { key: "pur_challans", label: "Delivery Challans Verification" },
  { key: "pur_suppliers_reg", label: "Approved Suppliers Registry" },
  { key: "pur_supplier_eval", label: "Supplier Performance Scorecards" },
  { key: "pur_stock_register", label: "General Stock Inventory Register" },
  { key: "pur_reagents_log", label: "Reagents Inventory & Expiries log" }
];

export const KITCHEN_FEATURES = [
  { key: "kitchen_diet_charts", label: "Patient Diet Charts Register" },
  { key: "kitchen_temp_pantry", label: "Pantry Refrigerator Temperature" },
  { key: "kitchen_hygiene_check", label: "Daily Kitchen Sanitation Checklist" },
  { key: "kitchen_inventory", label: "Kitchen stock inventory log" }
];

export const SECURITY_FEATURES = [
  { key: "security_incidents", label: "Security Incident Register" },
  { key: "security_guard_patrol", label: "Guard Patrol Round Checklist" },
  { key: "security_visitor_badges", label: "Visitor Badges Allocation log" },
  { key: "security_cctv_monitoring", label: "CCTV Feed verification logs" }
];

export const COLLECTION_FEATURES = [
  { key: "coll_center_runs", label: "Collection Center sample log" },
  { key: "coll_temp_carrier", label: "Carrier Box transport temperature" },
  { key: "coll_rejection", label: "Sample Rejection at center" },
  { key: "coll_roster", label: "Phlebotomist field duty roster" }
];

export const SAMPLECOLLECTION_FEATURES = [
  { key: "sc_central_receipt", label: "Central Sample receipt register" },
  { key: "sc_temp_monitoring", label: "Sample Storage temperature logs" },
  { key: "sc_integrity_check", label: "Sample Volume & Integrity checks" },
  { key: "sc_rejection_log", label: "Central Rejection log" }
];

export const TELECALLING_FEATURES = [
  { key: "tele_queries_log", label: "Customer Queries & Bookings Register" },
  { key: "tele_report_dispatch", label: "Reports dispatch tracking register" },
  { key: "tele_call_monitoring", label: "Staff Communication Checklist" }
];

export const ACCOUNTS_FEATURES = [
  { key: "accts_dashboard", label: "Financial Dashboard & KPIs" },
  { key: "accts_budgeting", label: "Annual Corporate Budgeting & Planning" },
  { key: "accts_cost_centers", label: "Branch Cost Center Management" },
  { key: "accts_chart_of_accounts", label: "Chart of Accounts (COA) Master" },
  { key: "accts_patient_billing", label: "Patient Billing & Revenue Cycle" },
  { key: "accts_cc_collection", label: "Collection Center Daily Logs" },
  { key: "accts_cc_settlement", label: "Collection Center Settlements" },
  { key: "accts_corporate_billing", label: "Hospital & Corporate Billing" },
  { key: "accts_receivables", label: "Accounts Receivable (AR) Ageing" },
  { key: "accts_payables", label: "Accounts Payable (AP) & Vendor Payments" },
  { key: "accts_expenses", label: "Departmental Expense Management" },
  { key: "accts_payroll", label: "Payroll, PF, ESI & TDS Integration" },
  { key: "accts_fixed_assets", label: "Fixed Asset & Depreciation Registry" },
  { key: "accts_inventory_finance", label: "Inventory Cost-Per-Test Valuation" },
  { key: "accts_banking", label: "Bank Accounts & Reconciliation" },
  { key: "accts_gst_tax", label: "GST (CGST/SGST/IGST) Tax Module" },
  { key: "accts_tds_tax", label: "TDS Compliance & Returns" },
  { key: "accts_financial_reports", label: "Financial Statements (P&L, Balance Sheet)" },
  { key: "accts_approvals", label: "Multi-Level Expense Approval Workflows" },
  { key: "accts_audit_trail", label: "Financial Audit Trail logs" }
];

export const DESIGN_FEATURES = [
  { key: "design_media_tasks", label: "Marketing Material Design Log" },
  { key: "design_brand_guidelines", label: "Brand Guidelines & Symbols Control" }
];

export const MARKETING_FEATURES = [
  { key: "mktg_campaign_planner", label: "Campaign Marketing Calendar" },
  { key: "mktg_doctor_feedback", label: "Doctor/Client Feedback Collection" },
  { key: "mktg_expense_tracking", label: "Marketing travel & expense log" }
];

export const ERPADMIN_FEATURES = [
  { key: "erpadmin_access_logs", label: "Access logs audit checklist" },
  { key: "erpadmin_config_backups", label: "System Config & DB backup log" }
];

export const DEPT_CONN_FEATURES = [
  { key: "conn_quality", label: "Quality Department Homepage Connection" },
  { key: "conn_microbiology", label: "Microbiology Homepage Connection" },
  { key: "conn_serology", label: "Serology Homepage Connection" },
  { key: "conn_biochemistry", label: "Biochemistry Homepage Connection" },
  { key: "conn_haematology", label: "Haematology Homepage Connection" },
  { key: "conn_histopathology", label: "Histopathology Homepage Connection" },
  { key: "conn_flowcytometry", label: "Flow Cytometry Homepage Connection" },
  { key: "conn_it", label: "IT Homepage Connection" },
  { key: "conn_backoffice", label: "BackOffice Homepage Connection" },
  { key: "conn_hr", label: "HR Homepage Connection" },
  { key: "conn_biomedical", label: "Biomedical Engineering Homepage Connection" },
  { key: "conn_maintenance", label: "Maintenance Homepage Connection" },
  { key: "conn_housekeeping", label: "Housekeeping Homepage Connection" },
  { key: "conn_purchase", label: "Purchase & Store Homepage Connection" },
  { key: "conn_collection", label: "Outstation Collection Homepage Connection" },
  { key: "conn_samplecollection", label: "Sample Collection Centre Homepage Connection" },
  { key: "conn_telecalling", label: "Call Centre Homepage Connection" },
  { key: "conn_accounts", label: "Accounts Homepage Connection" },
  { key: "conn_design", label: "Design Homepage Connection" },
  { key: "conn_marketing", label: "Marketing Homepage Connection" },
  { key: "conn_erpadmin", label: "ERP Administration Homepage Connection" },
  { key: "conn_kitchen", label: "Kitchen Homepage Connection" },
  { key: "conn_security", label: "Security Homepage Connection" }
];

const DEPT_FEATURES_CONFIG = {
  "Phlebotomy": {
    features: PHLEBOTOMY_FEATURES,
    color: "#0F6E56",
    lightColor: "#E1F5EE",
    borderColor: "#5DCAA5",
    textColor: "#085041"
  },
  "Reception": {
    features: RECEPTION_FEATURES,
    color: "#185FA5",
    lightColor: "#E6F1FB",
    borderColor: "#89BCEB",
    textColor: "#0C447C"
  },
  "Haematology": {
    features: HAEMATOLOGY_FEATURES,
    color: "#854F0B",
    lightColor: "#FEF3C7",
    borderColor: "#FCD34D",
    textColor: "#78350F"
  },
  "Clinical Pathology": {
    features: CLINICAL_PATHOLOGY_FEATURES,
    color: "#4B5563",
    lightColor: "#F3F4F6",
    borderColor: "#D1D5DB",
    textColor: "#1F2937"
  },
  "Cytogenetics": {
    features: CYTOGENETICS_FEATURES,
    color: "#6366F1",
    lightColor: "#EEF2FF",
    borderColor: "#C7D2FE",
    textColor: "#3730A3"
  },
  "Microbiology": {
    features: MICROBIOLOGY_FEATURES,
    color: "#10B981",
    lightColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    textColor: "#065F46"
  },
  "Serology": {
    features: SEROLOGY_FEATURES,
    color: "#EC4899",
    lightColor: "#FDF2F8",
    borderColor: "#FBCFE8",
    textColor: "#9D174D"
  },
  "Histopathology": {
    features: HISTOPATHOLOGY_FEATURES,
    color: "#F59E0B",
    lightColor: "#FEF3C7",
    borderColor: "#FDE68A",
    textColor: "#92400E"
  },
  "Flow Cytometry": {
    features: FLOW_CYTOMETRY_FEATURES,
    color: "#8B5CF6",
    lightColor: "#F5F3FF",
    borderColor: "#DDD6FE",
    textColor: "#5B21B6"
  },
  "Maintenance": {
    features: MAINTENANCE_FEATURES,
    color: "#475569",
    lightColor: "#F1F5F9",
    borderColor: "#CBD5E1",
    textColor: "#1E293B"
  },
  "HouseKeeping": {
    features: HOUSEKEEPING_FEATURES,
    color: "#0D9488",
    lightColor: "#F0FDFA",
    borderColor: "#99F6E4",
    textColor: "#115E59"
  },
  "IT": {
    features: IT_FEATURES,
    color: "#2563EB",
    lightColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    textColor: "#1E40AF"
  },
  "BackOffice": {
    features: BACKOFFICE_FEATURES,
    color: "#4F46E5",
    lightColor: "#EEF2FF",
    borderColor: "#C7D2FE",
    textColor: "#3730A3"
  },
  "Administration": {
    features: ADMINISTRATION_FEATURES,
    color: "#BE123C",
    lightColor: "#FFF1F2",
    borderColor: "#FECDD3",
    textColor: "#9F1239"
  },
  "Biochemistry": {
    features: BIOCHEMISTRY_FEATURES,
    color: "#0284C7",
    lightColor: "#F0F9FF",
    borderColor: "#BAE6FD",
    textColor: "#0369A1"
  },
  "Molecular Biology": {
    features: MOL_BIOLOGY_FEATURES,
    color: "#4F46E5",
    lightColor: "#EEF2FF",
    borderColor: "#C7D2FE",
    textColor: "#3730A3"
  },
  "Molecular Genetics": {
    features: MOL_GENETICS_FEATURES,
    color: "#0891B2",
    lightColor: "#ECFEFF",
    borderColor: "#CFFAFE",
    textColor: "#0E7490"
  },
  "Quality": {
    features: QUALITY_FEATURES,
    color: "#0D9488",
    lightColor: "#F0FDFA",
    borderColor: "#99F6E4",
    textColor: "#115E59"
  },
  "Human Resource": {
    features: HR_FEATURES,
    color: "#DB2777",
    lightColor: "#FDF2F8",
    borderColor: "#FBCFE8",
    textColor: "#BE185D"
  },
  "Biomedical Engineering": {
    features: BIOMEDICAL_FEATURES,
    color: "#D97706",
    lightColor: "#FEF3C7",
    borderColor: "#FCD34D",
    textColor: "#B45309"
  },
  "Purchase": {
    features: PURCHASE_FEATURES,
    color: "#059669",
    lightColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    textColor: "#047857"
  },
  "Kitchen": {
    features: KITCHEN_FEATURES,
    color: "#EA580C",
    lightColor: "#FFF7ED",
    borderColor: "#FFEDD5",
    textColor: "#C2410C"
  },
  "Security": {
    features: SECURITY_FEATURES,
    color: "#4B5563",
    lightColor: "#F3F4F6",
    borderColor: "#D1D5DB",
    textColor: "#374151"
  },
  "Collection": {
    features: COLLECTION_FEATURES,
    color: "#0284C7",
    lightColor: "#F0F9FF",
    borderColor: "#BAE6FD",
    textColor: "#0369A1"
  },
  "Sample Collection Centre": {
    features: SAMPLECOLLECTION_FEATURES,
    color: "#0D9488",
    lightColor: "#F0FDFA",
    borderColor: "#99F6E4",
    textColor: "#115E59"
  },
  "Call Centre": {
    features: TELECALLING_FEATURES,
    color: "#4F46E5",
    lightColor: "#EEF2FF",
    borderColor: "#C7D2FE",
    textColor: "#3730A3"
  },
  "Accounts": {
    features: ACCOUNTS_FEATURES,
    color: "#059669",
    lightColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    textColor: "#047857"
  },
  "Design": {
    features: DESIGN_FEATURES,
    color: "#EC4899",
    lightColor: "#FDF2F8",
    borderColor: "#FBCFE8",
    textColor: "#9D174D"
  },
  "Marketing": {
    features: MARKETING_FEATURES,
    color: "#EA580C",
    lightColor: "#FFF7ED",
    borderColor: "#FFEDD5",
    textColor: "#C2410C"
  },
  "ERP Administration": {
    features: ERPADMIN_FEATURES,
    color: "#BE123C",
    lightColor: "#FFF1F2",
    borderColor: "#FECDD3",
    textColor: "#9F1239"
  },
  "Dept Connections": {
    features: DEPT_CONN_FEATURES,
    color: "#4F46E5",
    lightColor: "#EEF2FF",
    borderColor: "#C7D2FE",
    textColor: "#3730A3"
  }
};

export default function MasterControl() {
  const [tab, setTab]               = useState("equipment");
  const [equipment, setEquipment]   = useState([]);
  const [users, setUsers]           = useState([]);
  const [loadingEq, setLoadingEq]   = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [modal, setModal]           = useState(null); // "addEq"|"editEq"|"accessEdit"
  const [selected, setSelected]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [filterDept, setFilterDept] = useState("All");
  const [searchUser, setSearchUser] = useState("");
  const [eqForm, setEqForm]         = useState({
    id:"", name:"", dept:"All", type:"Analyser", calFreq:"6 months", serialNo:"", manufacturer:"", model:""
  });
  const [accessForm, setAccessForm] = useState({ modules:[] });

  // Dashboard Feature flags
  const [featureFlags, setFeatureFlags] = useState({});
  const [loadingFlags, setLoadingFlags] = useState(false);
  const [selectedFeatDept, setSelectedFeatDept] = useState("Phlebotomy");

  // Bulk generator states
  const [bulkDept, setBulkDept]         = useState("Phlebotomy");
  const [bulkFeature, setBulkFeature]   = useState("");
  const [bulkCount, setBulkCount]       = useState(10);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkSuccess, setBulkSuccess]   = useState("");

  // All dept names
  const allDepts = ["All", ...Object.keys(DEPT_PERMISSIONS)];

  const loadFeatureFlags = useCallback(async () => {
    setLoadingFlags(true);
    try {
      const docRef = doc(db, "appSettings", "features");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setFeatureFlags(snap.data());
      } else {
        const defaults = {};
        const lists = [
          PHLEBOTOMY_FEATURES, RECEPTION_FEATURES, HAEMATOLOGY_FEATURES, CLINICAL_PATHOLOGY_FEATURES,
          CYTOGENETICS_FEATURES, MICROBIOLOGY_FEATURES, SEROLOGY_FEATURES, HISTOPATHOLOGY_FEATURES,
          FLOW_CYTOMETRY_FEATURES, MAINTENANCE_FEATURES, HOUSEKEEPING_FEATURES, IT_FEATURES,
          BACKOFFICE_FEATURES, ADMINISTRATION_FEATURES, DEPT_CONN_FEATURES, BIOCHEMISTRY_FEATURES,
          MOL_BIOLOGY_FEATURES, MOL_GENETICS_FEATURES, QUALITY_FEATURES, HR_FEATURES,
          BIOMEDICAL_FEATURES, PURCHASE_FEATURES, KITCHEN_FEATURES, SECURITY_FEATURES,
          COLLECTION_FEATURES, SAMPLECOLLECTION_FEATURES, TELECALLING_FEATURES, ACCOUNTS_FEATURES,
          DESIGN_FEATURES, MARKETING_FEATURES, ERPADMIN_FEATURES
        ];
        lists.forEach(list => {
          list.forEach(f => defaults[f.key] = true);
        });
        setFeatureFlags(defaults);
      }
    } catch (e) {
      console.warn("Could not load feature flags from Firestore.", e);
    }
    setLoadingFlags(false);
  }, []);

  const saveFeatureFlags = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "appSettings", "features"), featureFlags);
      alert("Dashboard feature toggles saved successfully.");
    } catch (e) {
      console.error("Error saving feature flags:", e);
      alert("Error saving feature toggles.");
    }
    setSaving(false);
  };

  const generateBulkData = async () => {
    if (!bulkFeature) { alert("Please select a feature to generate data for."); return; }
    setBulkGenerating(true);
    setBulkSuccess("");
    try {
      const batch = [];
      const today = new Date();
      
      for (let i = 0; i < bulkCount; i++) {
        const recordDate = new Date();
        recordDate.setDate(today.getDate() - i);
        const dateStr = recordDate.toISOString().split("T")[0];
        
        let data = {};
        if (bulkFeature.includes("room_temp") || bulkFeature.includes("humidity")) {
          data = {
            date: dateStr,
            temp: (Math.random() * 4 + 20).toFixed(1) + "°C",
            humidity: Math.floor(Math.random() * 15 + 45) + "%",
            cleaned: "Yes",
            remarks: "Normal operations",
            loggedBy: "System Generator"
          };
        } else if (bulkFeature.includes("temp_deepfreezer")) {
          data = {
            date: dateStr,
            temp: (-80 + (Math.random() * 8 - 4)).toFixed(1) + "°C",
            alarmChecked: "Yes",
            remarks: "No defrost cycles",
            loggedBy: "System Generator"
          };
        } else if (bulkFeature.includes("visitors_reg")) {
          const visitors = [
            { name: "Rahul Mehta", org: "Lal PathLabs", purpose: "Reference query", in: "10:15 AM", out: "11:00 AM" },
            { name: "Sarah John", org: "NABL", purpose: "Pre-audit check", in: "09:30 AM", out: "01:00 PM" },
            { name: "Dr. Amit Verma", org: "Self", purpose: "HOD consultation", in: "02:15 PM", out: "02:45 PM" },
            { name: "Suresh Kumar", org: "Roche Diagnostics", purpose: "Reagent delivery", in: "11:30 AM", out: "12:00 PM" },
            { name: "Meena Gupta", org: "Patient Family", purpose: "Report collection feedback", in: "04:00 PM", out: "04:30 PM" }
          ];
          const v = visitors[i % visitors.length];
          data = {
            date: dateStr,
            visitorName: v.name,
            organization: v.org,
            purpose: v.purpose,
            timeIn: v.in,
            timeOut: v.out,
            passNo: "PASS-" + Math.floor(Math.random() * 100 + 100),
            loggedBy: "System Generator"
          };
        } else if (bulkFeature.includes("housekeeping")) {
          data = {
            date: dateStr,
            dustingChecked: "Yes",
            moppingChecked: "Yes",
            wasteDisposed: "Yes",
            countersSanitized: "Yes",
            remarks: "Completed",
            loggedBy: "System Generator"
          };
        } else if (bulkFeature.includes("rejection") || bulkFeature.includes("sample_rejection")) {
          const reasons = ["Hemolyzed specimen", "Inadequate volume", "Clotted EDTA tube", "Incorrect tube type used", "Labeling error"];
          data = {
            date: dateStr,
            patientName: "Bulk Patient " + (i + 1),
            patientId: "PID-" + Math.floor(Math.random() * 1000 + 1000),
            rejectionReason: reasons[i % reasons.length],
            loggedBy: "System Generator"
          };
        } else if (bulkFeature.includes("error_log") || bulkFeature.includes("non_conformance")) {
          const issues = [
            "Patient age entered incorrectly in registration",
            "Specimen tube label blurred and unreadable",
            "Barcoding machine print alignment mismatch",
            "Delay in dispatch of home collection box",
            "Requisition form details missing clinic name"
          ];
          data = {
            date: dateStr,
            description: issues[i % issues.length],
            actionTaken: "Corrected and staff counselled.",
            remarks: "Resolved",
            loggedBy: "System Generator"
          };
        } else if (bulkFeature.includes("consent_form")) {
          const types = ["HIV", "COVID 19", "Karyotyping", "Genetics", "Cytology"];
          data = {
            date: dateStr,
            patientName: "Patient Consent " + (i + 1),
            patientId: "PID-" + Math.floor(Math.random() * 1000 + 1000),
            consentType: types[i % types.length],
            witnessName: "Witness " + (i + 1),
            status: "Signed & Filed",
            loggedBy: "System Generator"
          };
        } else if (bulkFeature.includes("advisory_services")) {
          const queries = [
            "Borderline HbA1c interpretation request",
            "Reflex lipid profile criteria inquiry",
            "Fasting requirement for insulin check query"
          ];
          data = {
            date: dateStr,
            queryText: queries[i % queries.length],
            adviceGiven: "Advised clinician on diagnostic boundaries.",
            advisorName: "Dr. Rajesh Sharma",
            loggedBy: "System Generator"
          };
        } else if (bulkFeature.includes("iqc_") || bulkFeature.includes("_iqc_")) {
          // IQC analyzer control run
          let mean = 13.5;
          let sd = 0.45;
          let lot = "CTRL-HAEM-001";
          let analyte = "Hemoglobin";
          let unit = "g/dL";
          
          if (bulkFeature.includes("sysmex")) {
            analyte = "Hemoglobin (Sysmex XN 1000)";
            mean = 14.2;
            sd = 0.35;
            lot = "SYS-QC-XN12";
          } else if (bulkFeature.includes("alinity")) {
            analyte = "WBC (Alinity hq)";
            mean = 7.5;
            sd = 0.3;
            lot = "ALI-QC-HQ34";
            unit = "10^3/µL";
          } else if (bulkFeature.includes("acl")) {
            analyte = "PT (ACL TOP)";
            mean = 12.8;
            sd = 0.4;
            lot = "ACL-QC-TP56";
            unit = "seconds";
          } else if (bulkFeature.includes("esr")) {
            analyte = "ESR (Manual)";
            mean = 15.0;
            sd = 1.0;
            lot = "ESR-QC-M1";
            unit = "mm/hr";
          } else if (bulkFeature.includes("minicap")) {
            analyte = "HbA1c (Minicap)";
            mean = 5.8;
            sd = 0.15;
            lot = "CAP-QC-MC78";
            unit = "%";
          } else if (bulkFeature.includes("atellica")) {
            analyte = "Platelets (Atellica)";
            mean = 250;
            sd = 15;
            lot = "ATE-QC-PLT9";
            unit = "10^3/µL";
          }
          
          const val = parseFloat((mean + (Math.random() * 3 * sd - 1.5 * sd)).toFixed(2));
          const zScore = parseFloat(((val - mean) / sd).toFixed(2));
          let status = "Pass";
          let violation = "None";
          if (Math.abs(zScore) > 3) {
            status = "Reject";
            violation = "1_3s Rule Breach";
          } else if (Math.abs(zScore) > 2) {
            status = "Warning";
            violation = "1_2s Warning Alert";
          }

          data = {
            date: dateStr,
            analyte,
            value: val,
            mean,
            sd,
            unit,
            lotNumber: lot,
            zScore,
            status,
            violation,
            loggedBy: "System Generator"
          };
        } else if (bulkFeature.includes("lot_reagents")) {
          // Lot to lot verification
          data = {
            date: dateStr,
            analyte: "Hemoglobin",
            currentLot: "LOT-A-2026",
            newLot: "LOT-B-2026",
            sampleCount: 20,
            slope: (0.98 + Math.random() * 0.04).toFixed(3),
            intercept: (0.05 + Math.random() * 0.1 - 0.05).toFixed(3),
            rValue: (0.992 + Math.random() * 0.006).toFixed(4),
            bias: (Math.random() * 2 - 1).toFixed(2) + "%",
            status: "Approved",
            loggedBy: "System Generator"
          };
        } else if (bulkFeature === "maint_log_power_monitoring") {
          data = {
            date: dateStr,
            val: `Voltages Phase 1/2/3: ${(Math.random() * 8 + 226).toFixed(1)}V / ${(Math.random() * 8 + 226).toFixed(1)}V / ${(Math.random() * 8 + 226).toFixed(1)}V | Freq: ${(Math.random() * 0.3 + 49.85).toFixed(2)}Hz | PF: ${(Math.random() * 0.03 + 0.95).toFixed(2)}`,
            status: "Pass",
            remarks: "Feeder power parameters within normal limits",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "maint_log_ups_reading") {
          data = {
            date: dateStr,
            val: `Input: ${(Math.random() * 10 + 222).toFixed(1)}V | Output: 230V stable | Batt: 100% charged | Load: ${Math.floor(Math.random() * 10 + 40)}%`,
            status: "Pass",
            remarks: "UPS online backup test successful",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "maint_log_fire_extinguisher") {
          data = {
            date: dateStr,
            val: `FE-MBL-${String(i % 5 + 1).padStart(2, "0")} check: pressure dial green, physical seal intact, nozzle clear`,
            status: "Pass",
            remarks: "Inspected; certification tag active",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "maint_log_high_dust") {
          data = {
            date: dateStr,
            val: "Ceiling lofts, ventilation grilles, electrical conduits free of cobwebs/dust",
            status: "Pass",
            remarks: "Weekly cleaning completed",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "hk_daily_cleaning") {
          data = {
            date: dateStr,
            val: "Mopping, dusting, waste baskets emptied in all clinical areas",
            status: "Pass",
            remarks: "Housekeeping supervisor signed-off",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "hk_restroom_tissue_soap") {
          data = {
            date: dateStr,
            val: "Tissue rolls refilled, liquid handwash soap replenished in Restrooms 1-8",
            status: "Pass",
            remarks: "All restrooms cleaned and stocked",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "hk_sodium_hypo_reconstitute") {
          data = {
            date: dateStr,
            val: "Prepared 1% Sodium Hypochlorite dilution (200ml 5% bleach + 800ml water)",
            status: "Pass",
            remarks: "Dilution checked and tagged with prep date",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "hk_waste_dispatch") {
          data = {
            date: dateStr,
            val: `Dispatched bio-waste bag weight: Yellow: ${(Math.random() * 4 + 3).toFixed(1)}kg | Red: ${(Math.random() * 3 + 2).toFixed(1)}kg | Blue: ${(Math.random() * 2 + 1).toFixed(1)}kg`,
            status: "Pass",
            remarks: "Waste barcode scanned, logged in BMW record",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "it_daily_lis_monitoring") {
          data = {
            date: dateStr,
            val: `LIS sync active. Synced: ${Math.floor(Math.random() * 100 + 400)} reports | Critical alerts automated: ${Math.floor(Math.random() * 5 + 2)}`,
            status: "Pass",
            remarks: "All analyzer interfaces active",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "it_offsite_backup") {
          data = {
            date: dateStr,
            val: `Offsite database replication succeeded. Size: ${(Math.random() * 50 + 1200).toFixed(1)}MB | Cloud sync time: ${Math.floor(Math.random() * 5 + 3)}s`,
            status: "Pass",
            remarks: "Encrypted backup verified",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "it_unauthorized_access") {
          const attempts = ["IP: 192.168.1.104 - 0 failed logins", "IP: 192.168.10.22 - 0 failed logins", "IP: 10.0.0.12 - 0 failed logins"];
          data = {
            date: dateStr,
            val: attempts[i % attempts.length],
            status: "Pass",
            remarks: "No security intrusions detected",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "it_transcription_interface_error") {
          data = {
            date: dateStr,
            val: "Checked interface transmissions. 0 transcription errors found.",
            status: "Pass",
            remarks: "HL7 query integrity verified",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "bo_sample_receiving") {
          data = {
            date: dateStr,
            val: `Received and sorted: ${Math.floor(Math.random() * 100 + 250)} specimens from ${Math.floor(Math.random() * 4 + 6)} collection centers`,
            status: "Pass",
            remarks: "All barcodes validated at sorting desk",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "bo_transit_time_outliers") {
          const durations = [75, 90, 85, 130, 95];
          const dur = durations[i % durations.length];
          data = {
            date: dateStr,
            val: `Sample batch transit: ${dur} minutes (Target < 120 mins)`,
            status: dur > 120 ? "Outlier" : "Pass",
            remarks: dur > 120 ? "Driver delayed in traffic. CAPA registered." : "On time",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "bo_temp_transport") {
          const temps = [4.2, 5.0, 6.1, 8.8, 5.5];
          const tVal = temps[i % temps.length];
          data = {
            date: dateStr,
            val: `Transport cold box temperature: ${tVal}°C (Target 2.0 - 8.0°C)`,
            status: (tVal >= 2.0 && tVal <= 8.0) ? "Pass" : "Fail",
            remarks: (tVal >= 2.0 && tVal <= 8.0) ? "Cold chain maintained" : "Temperature warning logged",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "bo_non_conformance") {
          data = {
            date: dateStr,
            val: "Checked received batch sample integrity. 0 leakages / 0 registration mismatches.",
            status: "Pass",
            remarks: "Batch compliance verified",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "admin_risk_management") {
          data = {
            date: dateStr,
            val: "Reviewed Administration Risk Register: Patient ID mismatch & LIMS downtime risks reviewed.",
            status: "Pass",
            remarks: "Mitigation controls active",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "admin_improvement_opportunities") {
          data = {
            date: dateStr,
            val: "Reviewed Opportunity for Improvement (OFI) logs. Action items assigned.",
            status: "Pass",
            remarks: "Continual improvement cycle verified",
            inspector: "System Generator"
          };
        } else if (bulkFeature === "admin_director_reviews") {
          data = {
            date: dateStr,
            val: "NABL audit documentation & Quality Indicators monthly sign-off completed by Director.",
            status: "Pass",
            remarks: "ISO 15189 compliance approved",
            inspector: "System Generator"
          };
        } else {
          data = {
            date: dateStr,
            activity: "Bulk record logging",
            status: "Verified",
            remarks: "NABL Compliance audit trial data",
            loggedBy: "System Generator"
          };
        }
        
        const recordTimestamp = new Date(recordDate);
        
        batch.push(addDoc(collection(db, "interactiveLogs"), {
          department: bulkDept,
          featureKey: bulkFeature,
          data: data,
          createdAt: recordTimestamp,
          createdBy: "System Generator"
        }));
      }
      
      await Promise.all(batch);
      setBulkSuccess(`Successfully generated and inserted ${bulkCount} mock logs for ${bulkFeature}.`);
    } catch (e) {
      console.error("Bulk insert failed:", e);
      alert("Bulk data insertion failed.");
    }
    setBulkGenerating(false);
  };

  const loadEquipment = useCallback(async () => {
    setLoadingEq(true);
    try {
      const snap = await getDocs(query(collection(db, "masterEquipment"), orderBy("createdAt","desc")));
      if (snap.empty) {
        setEquipment(DEFAULT_EQUIPMENT);
      } else {
        setEquipment(snap.docs.map(d => ({ firestoreId:d.id, ...d.data() })));
      }
    } catch {
      setEquipment(DEFAULT_EQUIPMENT);
    }
    setLoadingEq(false);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt","desc")));
      setUsers(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    loadEquipment();
    loadUsers();
    loadFeatureFlags();
  }, [loadEquipment, loadUsers, loadFeatureFlags]);

  // Save equipment
  const saveEquipment = async () => {
    if (!eqForm.name || !eqForm.id) { alert("Equipment ID and name are required."); return; }
    setSaving(true);
    try {
      if (modal === "addEq") {
        await addDoc(collection(db, "masterEquipment"), {
          ...eqForm, createdAt:serverTimestamp(), createdBy:auth.currentUser?.email||"",
        });
      } else if (modal === "editEq" && selected?.firestoreId) {
        await updateDoc(doc(db, "masterEquipment", selected.firestoreId), {
          ...eqForm, updatedAt:serverTimestamp(), updatedBy:auth.currentUser?.email||"",
        });
      }
      setModal(null);
      loadEquipment();
    } catch(e) { console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  // Delete equipment
  const deleteEquipment = async (eq) => {
    if (!window.confirm(`Delete ${eq.name}?`)) return;
    if (eq.firestoreId) {
      await deleteDoc(doc(db, "masterEquipment", eq.firestoreId));
      loadEquipment();
    }
  };

  // Save user access overrides
  const saveAccess = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", selected.id), {
        customModules: accessForm.modules,
        accessUpdatedAt: serverTimestamp(),
        accessUpdatedBy: auth.currentUser?.email||"",
      });
      setModal(null);
      loadUsers();
    } catch(e) { console.error(e); alert("Error saving access."); }
    setSaving(false);
  };

  const openAccessEdit = (u) => {
    setSelected(u);
    const defaultPerms = DEPT_PERMISSIONS[u.department]?.[u.role] ||
                         DEPT_PERMISSIONS[u.department]?.[Object.keys(DEPT_PERMISSIONS[u.department]||{})[0]];
    setAccessForm({ modules: u.customModules || defaultPerms?.modules || ["dashboard"] });
    setModal("accessEdit");
  };

  const ALL_MODULES = [
    // Core & General modules
    "dashboard", "kpi", "analytics", "documents", "ncr", "capa", "audit", "risk", "changecontrol",
    "mrm", "correctedreports", "complaints", "planning", "iqc", "eqa", "samples", "temperature",
    "inventory", "equipment", "breakdown", "equipmentlog", "training", "personnel", "feedback",
    "meetings", "vendors", "users", "amendment", "biosafety", "suppliers", "masterdata",
    "accesscontrol", "assets", "infosec", "secincidents", "accesslog", "dataretention", "help",
    "aiassistant", "testmaster",

    // Department-specific dashboards (all 30)
    "microbiology", "serology", "histopathology", "flowcytometry", "cytogenetics",
    "biochemistry", "haematology", "clinicalpathology", "molecularbiology", "moleculargenetics",
    "quality", "hr", "biomedical", "purchase", "maintenance", "housekeeping",
    "it", "kitchen", "security", "phlebotomy", "reception", "backoffice",
    "samplecollection", "telecalling", "accounts", "administration", "design",
    "marketing", "erpadmin", "collection"
  ];

  const filteredEq = equipment.filter(e =>
    filterDept === "All" || e.dept === filterDept || e.dept === "All"
  );

  const filteredUsers = users.filter(u =>
    !searchUser ||
    u.fullName?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.department?.toLowerCase().includes(searchUser.toLowerCase())
  );

  const S = {
    wrap:{ fontFamily:"'Inter',system-ui,sans-serif", background:"#F7F6F2", minHeight:"100vh" },
    topbar:{
      background:"#fff", borderBottom:"0.5px solid #E0DDD6",
      padding:"10px 20px", display:"flex", alignItems:"center",
      justifyContent:"space-between",
    },
    card:{
      background:"#fff", border:"0.5px solid #E0DDD6",
      borderRadius:12, overflow:"hidden", marginBottom:14,
    },
    tab:(a)=>({
      padding:"10px 16px", fontSize:13,
      fontWeight: a?500:400, color: a?"#0F6E56":"#888780",
      cursor:"pointer", background:"none", border:"none",
      borderBottom: a?"2px solid #0F6E56":"2px solid transparent",
    }),
    btn:{
      padding:"7px 14px", background:"#0F6E56", color:"#E1F5EE",
      border:"none", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer",
    },
    th:{ fontSize:10, fontWeight:500, color:"#888780" },
  };

  return (
    <div style={S.wrap}>

      {/* Top bar */}
      <div style={S.topbar}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:32, height:32, borderRadius:8, background:"#3C3489",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#EEEDFE", fontSize:16,
          }}>🛡</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>
              ERP Admin — master control
            </div>
            <div style={{ fontSize:11, color:"#888780" }}>
              Master data · Access authorization · Super admin only
            </div>
          </div>
        </div>
        <span style={{
          fontSize:11, padding:"3px 12px", borderRadius:20,
          background:"#EEEDFE", color:"#3C3489", border:"0.5px solid #AFA9EC",
          fontWeight:500,
        }}>
          ERP Administration
        </span>
      </div>

      {/* Tabs */}
      <div style={{
        background:"#fff", borderBottom:"0.5px solid #E0DDD6",
        padding:"0 20px", display:"flex",
      }}>
        {[
          { key:"equipment", label:"Master data — equipment" },
          { key:"departments", label:"Master data — departments" },
          { key:"access", label:"Access authorization" },
          { key:"features", label:"Dashboard features" },
          { key:"bulk", label:"Bulk data entry" },
        ].map(t => (
          <button key={t.key} style={S.tab(tab===t.key)} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>

        {/* ── MASTER DATA: EQUIPMENT ─────────────────────── */}
        {tab === "equipment" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
              {[
                { label:"Total equipment", val:equipment.length, sub:"In master register" },
                { label:"Departments",     val:[...new Set(equipment.map(e=>e.dept))].length, sub:"With equipment" },
                { label:"Analysers",       val:equipment.filter(e=>e.type==="Analyser").length, sub:"Critical instruments" },
                { label:"Storage units",   val:equipment.filter(e=>e.type==="Storage").length, sub:"Refrigerators & freezers" },
              ].map((c,i) => (
                <div key={i} style={{ background:"#F7F6F2", borderRadius:8, padding:"12px 14px" }}>
                  <div style={{ fontSize:11, color:"#888780", marginBottom:3 }}>{c.label}</div>
                  <div style={{ fontSize:22, fontWeight:500, color:"#2C2C2A" }}>{c.val}</div>
                  <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            <div style={S.card}>
              <div style={{
                padding:"11px 16px", borderBottom:"0.5px solid #E0DDD6",
                display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8,
              }}>
                <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A" }}>Equipment master register</div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <select style={{ ...inp, width:180 }} value={filterDept}
                    onChange={e => setFilterDept(e.target.value)}>
                    {allDepts.map(d => <option key={d}>{d}</option>)}
                  </select>
                  <button style={S.btn} onClick={() => {
                    setEqForm({ id:`EQ${String(equipment.length+1).padStart(3,"0")}`, name:"", dept:"All", type:"Analyser", calFreq:"6 months", serialNo:"", manufacturer:"", model:"" });
                    setModal("addEq");
                  }}>
                    + Add equipment
                  </button>
                </div>
              </div>

              {/* Table header */}
              <div style={{
                display:"grid", gridTemplateColumns:"70px 1fr 130px 90px 100px 100px 80px",
                padding:"7px 16px", background:"#F7F6F2",
                borderBottom:"0.5px solid #E0DDD6", gap:8,
              }}>
                {["Eq ID","Name","Department","Type","Cal. frequency","Serial no.",""].map((h,i)=>(
                  <div key={i} style={S.th}>{h}</div>
                ))}
              </div>

              {loadingEq && <div style={{ padding:20, color:"#888780", fontSize:13 }}>Loading…</div>}

              {filteredEq.map(eq => (
                <div key={eq.id} style={{
                  display:"grid", gridTemplateColumns:"70px 1fr 130px 90px 100px 100px 80px",
                  padding:"9px 16px", borderBottom:"0.5px solid #F1EFE8",
                  gap:8, alignItems:"center",
                }}>
                  <div style={{ fontSize:11, color:"#888780", fontFamily:"monospace" }}>{eq.id}</div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>{eq.name}</div>
                    {eq.manufacturer && <div style={{ fontSize:10, color:"#888780" }}>{eq.manufacturer} {eq.model}</div>}
                  </div>
                  <div style={{ fontSize:11, color:"#5F5E5A" }}>{eq.dept}</div>
                  <div>
                    <span style={{
                      fontSize:10, padding:"2px 8px", borderRadius:10, fontWeight:500,
                      background: eq.type==="Analyser"?"#E6F1FB":eq.type==="Storage"?"#E1F5EE":"#F1EFE8",
                      color: eq.type==="Analyser"?"#0C447C":eq.type==="Storage"?"#085041":"#5F5E5A",
                    }}>{eq.type}</span>
                  </div>
                  <div style={{ fontSize:11, color:"#5F5E5A" }}>{eq.calFreq}</div>
                  <div style={{ fontSize:11, color:"#888780", fontFamily:"monospace" }}>{eq.serialNo||"—"}</div>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={() => {
                      setSelected(eq);
                      setEqForm({ id:eq.id, name:eq.name, dept:eq.dept, type:eq.type, calFreq:eq.calFreq, serialNo:eq.serialNo||"", manufacturer:eq.manufacturer||"", model:eq.model||"" });
                      setModal("editEq");
                    }} style={{
                      padding:"3px 7px", background:"#F7F6F2",
                      border:"0.5px solid #D3D1C7", borderRadius:6, fontSize:11, cursor:"pointer",
                    }}>Edit</button>
                    {eq.firestoreId && (
                      <button onClick={() => deleteEquipment(eq)} style={{
                        padding:"3px 7px", background:"#FFF5F5",
                        border:"0.5px solid #E24B4A", borderRadius:6, fontSize:11, cursor:"pointer", color:"#A32D2D",
                      }}>Del</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── MASTER DATA: DEPARTMENTS ───────────────────── */}
        {tab === "departments" && (
          <div style={S.card}>
            <div style={{
              padding:"11px 16px", borderBottom:"0.5px solid #E0DDD6",
              fontSize:13, fontWeight:500, color:"#2C2C2A",
            }}>
              Department & role register — all 30 departments
            </div>
            <div style={{
              display:"grid", gridTemplateColumns:"70px 1fr 200px",
              padding:"7px 16px", background:"#F7F6F2",
              borderBottom:"0.5px solid #E0DDD6", gap:8,
            }}>
              {["#","Department","Roles"].map((h,i) => <div key={i} style={S.th}>{h}</div>)}
            </div>
            {Object.entries(DEPT_PERMISSIONS).map(([dept, roles], i) => (
              <div key={dept} style={{
                display:"grid", gridTemplateColumns:"70px 1fr 200px",
                padding:"9px 16px", borderBottom:"0.5px solid #F1EFE8", gap:8, alignItems:"center",
              }}>
                <div style={{ fontSize:11, color:"#B4B2A9" }}>{String(i+1).padStart(2,"0")}</div>
                <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>{dept}</div>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {Object.keys(roles).map(r => (
                    <span key={r} style={{
                      fontSize:10, padding:"2px 7px", borderRadius:10,
                      background:"#F1EFE8", color:"#5F5E5A",
                    }}>{r}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ACCESS AUTHORIZATION ───────────────────────── */}
        {tab === "access" && (
          <>
            <div style={{
              background:"#EEEDFE", border:"0.5px solid #AFA9EC",
              borderRadius:8, padding:"12px 16px", marginBottom:14,
              fontSize:12, color:"#3C3489", lineHeight:1.7,
            }}>
              <strong>Access authorization</strong> — Override default module access for individual users.
              Default access is determined by department + role. Use this to grant extra access or restrict specific users.
            </div>

            <div style={S.card}>
              <div style={{
                padding:"11px 16px", borderBottom:"0.5px solid #E0DDD6",
                display:"flex", alignItems:"center", justifyContent:"space-between", gap:8,
              }}>
                <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A" }}>
                  User access — {users.length} users
                </div>
                <input style={{ ...inp, width:220 }} placeholder="Search name, email, department…"
                  value={searchUser} onChange={e => setSearchUser(e.target.value)} />
              </div>

              {/* Table header */}
              <div style={{
                display:"grid", gridTemplateColumns:"1fr 140px 120px 100px 60px",
                padding:"7px 16px", background:"#F7F6F2",
                borderBottom:"0.5px solid #E0DDD6", gap:8,
              }}>
                {["User","Department","Role","Access",""].map((h,i) => (
                  <div key={i} style={S.th}>{h}</div>
                ))}
              </div>

              {loadingUsers && <div style={{ padding:20, color:"#888780", fontSize:13 }}>Loading users…</div>}

              {!loadingUsers && filteredUsers.length === 0 && (
                <div style={{ padding:24, textAlign:"center", color:"#888780", fontSize:13 }}>
                  No users found. Add users in User Management first.
                </div>
              )}

              {filteredUsers.map(u => {
                const defaultPerms = DEPT_PERMISSIONS[u.department]?.[u.role];
                const moduleCount = u.customModules?.length || defaultPerms?.modules?.length || 0;
                const hasOverride = !!u.customModules;
                return (
                  <div key={u.id} style={{
                    display:"grid", gridTemplateColumns:"1fr 140px 120px 100px 60px",
                    padding:"9px 16px", borderBottom:"0.5px solid #F1EFE8",
                    gap:8, alignItems:"center",
                  }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>
                        {u.fullName || u.name || "—"}
                      </div>
                      <div style={{ fontSize:11, color:"#888780" }}>{u.email}</div>
                    </div>
                    <div style={{ fontSize:11, color:"#5F5E5A" }}>{u.department}</div>
                    <div style={{ fontSize:11, color:"#5F5E5A" }}>{u.role}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{
                        fontSize:10, padding:"2px 7px", borderRadius:10, fontWeight:500,
                        background: hasOverride?"#FAEEDA":"#E1F5EE",
                        color: hasOverride?"#633806":"#085041",
                      }}>
                        {moduleCount} modules{hasOverride?" (custom)":""}
                      </span>
                    </div>
                    <div>
                      <button onClick={() => openAccessEdit(u)} style={{
                        padding:"4px 8px", background:"#F7F6F2",
                        border:"0.5px solid #D3D1C7", borderRadius:6, fontSize:11, cursor:"pointer",
                      }}>Edit</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── DASHBOARD FEATURES ─────────────────────────── */}
        {tab === "features" && (
          <div style={S.card}>
            <div style={{
              padding:"12px 16px", borderBottom:"0.5px solid #E0DDD6",
              display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12
            }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#2C2C2A" }}>Dashboard Feature Controls</div>
                <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>Enable or disable specific sections for individual dashboards.</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#5F5E5A" }}>Select Department:</label>
                <select style={{ ...inp, width: 180 }} value={selectedFeatDept} onChange={e => setSelectedFeatDept(e.target.value)}>
                  {Object.keys(DEPT_FEATURES_CONFIG).map(deptKey => (
                    <option key={deptKey} value={deptKey}>
                      {deptKey === "Dept Connections" ? "Department Connections" : deptKey}
                    </option>
                  ))}
                </select>
                <button style={S.btn} onClick={saveFeatureFlags} disabled={saving}>
                  {saving ? "Saving..." : "Save Feature Configurations"}
                </button>
              </div>
            </div>
            
            {loadingFlags ? (
              <div style={{ padding: 24, textAlign: "center", color: "#888780" }}>Loading configurations...</div>
            ) : (
              <div style={{ padding: 16 }}>
                {(() => {
                  const config = DEPT_FEATURES_CONFIG[selectedFeatDept] || DEPT_FEATURES_CONFIG["Phlebotomy"];
                  const features = config.features || [];
                  const color = config.color || "#0F6E56";
                  const lightColor = config.lightColor || "#E1F5EE";
                  const borderColor = config.borderColor || "#5DCAA5";
                  const textColor = config.textColor || "#085041";

                  return (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: color, marginBottom: 12, borderBottom: "0.5px solid #E0DDD6", paddingBottom: 6, display: "flex", justifyContent: "space-between" }}>
                        <span>{selectedFeatDept} Dashboard ({features.length} features)</span>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => {
                            const copy = { ...featureFlags };
                            features.forEach(f => copy[f.key] = true);
                            setFeatureFlags(copy);
                          }} style={{ fontSize: 10, background: "none", border: "none", color: "#0F6E56", cursor: "pointer", fontWeight: 600 }}>Enable All</button>
                          <button onClick={() => {
                            const copy = { ...featureFlags };
                            features.forEach(f => copy[f.key] = false);
                            setFeatureFlags(copy);
                          }} style={{ fontSize: 10, background: "none", border: "none", color: "#A32D2D", cursor: "pointer", fontWeight: 600 }}>Disable All</button>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: "55vh", overflowY: "auto", paddingRight: 6 }}>
                        {features.map(f => (
                          <label key={f.key} style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
                            background: featureFlags[f.key] ? lightColor : "#FAFAF8",
                            border: `0.5px solid ${featureFlags[f.key] ? borderColor : "#E0DDD6"}`,
                            borderRadius: 8, cursor: "pointer", transition: "all 0.1s"
                          }}>
                            <input
                              type="checkbox"
                              checked={!!featureFlags[f.key]}
                              onChange={e => setFeatureFlags(prev => ({ ...prev, [f.key]: e.target.checked }))}
                              style={{ accentColor: color }}
                            />
                            <span style={{ fontSize: 12, color: featureFlags[f.key] ? textColor : "#5F5E5A" }}>{f.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── BULK DATA ENTRY ────────────────────────────── */}
        {tab === "bulk" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
            {/* Control Form */}
            <div style={S.card}>
              <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8" }}>
                <div style={S.cardTitle}>Bulk Audit Logs Generator</div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 }}>Select Department</label>
                  <select style={inp} value={bulkDept} onChange={e => { setBulkDept(e.target.value); setBulkFeature(""); }}>
                    <option value="Phlebotomy">Phlebotomy Department</option>
                    <option value="Reception">Reception Department</option>
                    <option value="Sample Collection Centre">Sample Collection Centre</option>
                    <option value="Haematology">Haematology Department</option>
                    <option value="Clinical Pathology">Clinical Pathology Department</option>
                    <option value="Cytogenetics">Cytogenetics Department</option>
                    <option value="Microbiology">Microbiology Department</option>
                    <option value="Serology">Serology Department</option>
                    <option value="Histopathology">Histopathology Department</option>
                    <option value="Flow Cytometry">Flow Cytometry Department</option>
                    <option value="Maintenance">Maintenance Department</option>
                  </select>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 }}>Select Feature Log to Generate</label>
                  <select style={inp} value={bulkFeature} onChange={e => setBulkFeature(e.target.value)}>
                    <option value="">-- Choose Feature Log --</option>
                    {(() => {
                      if (bulkDept === "Phlebotomy") {
                        return [
                          { key: "phleb_room_temp", label: "Room Temperature - Phlebotomy" },
                          { key: "phleb_room_temp_sorting", label: "Room Temperature - Sample Sorting Room" },
                          { key: "phleb_temp_deepfreezer", label: "Temperature - Deep Freezer" },
                          { key: "phleb_humidity_sorting", label: "Humidity - Sample Sorting Room" },
                          { key: "phleb_uv_light", label: "UV Light details" },
                          { key: "phleb_housekeeping_phleb", label: "House Keeping - Phlebotomy" },
                          { key: "phleb_housekeeping_sorting", label: "House Keeping - Sample Sorting Room" },
                          { key: "phleb_rejection", label: "Sample Rejection - Phlebotomy" },
                          { key: "phleb_rejection_sorting", label: "Sample Rejection - Sample Sorting Room" },
                          { key: "phleb_error_log", label: "Error Log" },
                          { key: "phleb_non_conformance", label: "Non-Conformance" },
                        ];
                      } else if (bulkDept === "Reception") {
                        return [
                          { key: "recep_room_temp", label: "Room Temperature Log" },
                          { key: "recep_visitors_reg", label: "Visitors Register Form" },
                          { key: "recep_housekeeping", label: "House Keeping Checklist" },
                          { key: "recep_consent_form", label: "Consent Forms Log" },
                          { key: "recep_advisory_services", label: "Advisory Services Form" },
                          { key: "recep_report_delay", label: "Report Delay Details" },
                        ];
                      } else if (bulkDept === "Haematology") {
                        return [
                          { key: "haem_humidity", label: "Humidity & Room Temperature Log" },
                          { key: "haem_housekeeping", label: "House Keeping Checklist" },
                          { key: "haem_sample_rejection", label: "Sample Rejection and Rework" },
                          { key: "haem_error_log", label: "Error Log Sheet" },
                          { key: "haem_non_conformance", label: "Non Conformance Log" },
                          { key: "haem_iqc_sysmex", label: "IQC - SYSMEX XN 1000 Logs" },
                          { key: "haem_iqc_alinity", label: "IQC - Alinity HQ Logs" },
                          { key: "haem_iqc_acl", label: "IQC - ACL TOP Logs" },
                          { key: "haem_lot_reagents", label: "Lot Verification - Reagents" },
                        ];
                      } else if (bulkDept === "Clinical Pathology") {
                        return [
                          { key: "clin_humidity", label: "Humidity & Room Temperature Log" },
                          { key: "clin_housekeeping", label: "House Keeping Checklist" },
                          { key: "clin_sample_rejection", label: "Sample Rejection and Rework" },
                          { key: "clin_error_log", label: "Error Log Sheet" },
                          { key: "clin_non_conformance", label: "Non Conformance Log" },
                          { key: "clin_iqc_minicap", label: "IQC - Mini Cap Logs" },
                          { key: "clin_iqc_esr", label: "IQC - ESR (Manual) Logs" },
                          { key: "clin_lot_reagents", label: "Lot Verification - Reagents" },
                        ];
                      } else if (bulkDept === "Cytogenetics") {
                        return [
                          { key: "cyto_humidity", label: "Humidity & Room Temperature Log" },
                          { key: "cyto_housekeeping", label: "House Keeping Checklist" },
                          { key: "cyto_sample_rejection", label: "Sample Rejection log" },
                          { key: "cyto_error_log", label: "Error Log Sheet" },
                          { key: "cyto_non_conformance", label: "Non Conformance Log" },
                        ];
                      } else if (bulkDept === "Microbiology") {
                        return [
                          { key: "micro_humidity", label: "Humidity & Room Temperature Log" },
                          { key: "micro_housekeeping", label: "House Keeping Checklist" },
                          { key: "micro_sample_rejection", label: "Sample Rejection and Repeat Test" },
                          { key: "micro_error_log", label: "Error Log Sheet" },
                          { key: "micro_non_conformance", label: "Non Conformance Log" },
                        ];
                      } else if (bulkDept === "Serology") {
                        return [
                          { key: "ser_temp_refrigerator", label: "Temperature - Refrigerator Log" },
                          { key: "ser_sample_rejection", label: "Sample Rejection Log" },
                          { key: "ser_error_log", label: "Error Log Sheet" },
                          { key: "ser_non_conformance", label: "Non Conformance Log" },
                        ];
                      } else if (bulkDept === "Histopathology") {
                        return [
                          { key: "histo_humidity", label: "Humidity & Room Temperature Log" },
                          { key: "histo_housekeeping", label: "House Keeping Checklist" },
                          { key: "histo_error_log", label: "Error Log Sheet" },
                          { key: "histo_non_conformance", label: "Non Conformance Log" },
                        ];
                      } else if (bulkDept === "Flow Cytometry") {
                        return [
                          { key: "flow_temp_refrigerator", label: "Temperature - Refrigerator Log" },
                          { key: "flow_sample_rejection", label: "Sample Rejection Log" },
                          { key: "flow_error_log", label: "Error Log Sheet" },
                          { key: "flow_non_conformance", label: "Non Conformance Log" },
                        ];
                      } else if (bulkDept === "Maintenance") {
                        return [
                          { key: "maint_log_power_monitoring", label: "Power Supply Monitoring" },
                          { key: "maint_log_ups_reading", label: "UPS Reading Log" },
                          { key: "maint_log_fire_extinguisher", label: "Fire Extinguisher Checklist" },
                          { key: "maint_log_high_dust", label: "High Dust Log" }
                        ];
                      } else if (bulkDept === "HouseKeeping") {
                        return [
                          { key: "hk_daily_cleaning", label: "Daily Cleaning Mopping Waste" },
                          { key: "hk_restroom_tissue_soap", label: "Restroom Tissue Soap check" },
                          { key: "hk_sodium_hypo_reconstitute", label: "Sodium Hypo Dilution log" },
                          { key: "hk_waste_dispatch", label: "Waste Dispatch Record" }
                        ];
                      } else if (bulkDept === "IT") {
                        return [
                          { key: "it_daily_lis_monitoring", label: "Daily LIS Monitor Log" },
                          { key: "it_offsite_backup", label: "Offsite Backup Log" },
                          { key: "it_unauthorized_access", label: "Security Login Attempts" },
                          { key: "it_transcription_interface_error", label: "Interface Sync Error Log" }
                        ];
                      } else if (bulkDept === "BackOffice") {
                        return [
                          { key: "bo_sample_receiving", label: "Sample receiving Log" },
                          { key: "bo_transit_time_outliers", label: "Transit Time Outliers" },
                          { key: "bo_temp_transport", label: "Transport Temp checks" },
                          { key: "bo_non_conformance", label: "Non Conformance Log" }
                        ];
                      } else if (bulkDept === "Administration") {
                        return [
                          { key: "admin_risk_management", label: "Risk Register items" },
                          { key: "admin_improvement_opportunities", label: "OFI Improvements" },
                          { key: "admin_director_reviews", label: "Director sign-offs" }
                        ];
                      } else {
                        return [
                          { key: "scc_room_temp", label: "Room Temperature Log" },
                          { key: "scc_housekeeping", label: "House Keeping Checklist" },
                        ];
                      }
                    })().map(bf => (
                      <option key={bf.key} value={bf.key}>{bf.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 }}>Number of Daily Records (distributed consecutively backwards)</label>
                  <select style={inp} value={bulkCount} onChange={e => setBulkCount(Number(e.target.value))}>
                    <option value="5">5 Days / Records</option>
                    <option value="10">10 Days / Records</option>
                    <option value="20">20 Days / Records</option>
                    <option value="30">30 Days / Records</option>
                  </select>
                </div>

                <button
                  style={{ ...S.btn, width: "100%", padding: "10px 14px", fontSize: 13 }}
                  onClick={generateBulkData}
                  disabled={bulkGenerating || !bulkFeature}
                >
                  {bulkGenerating ? "Generating Audit Trails..." : `⚡ Generate ${bulkCount} Mock Logs`}
                </button>
              </div>
            </div>

            {/* Informational helper and successes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ ...S.card, padding: 16, background: "#EEEDFE", borderColor: "#AFA9EC", color: "#3C3489", marginBottom: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>💡 Compliance Bulk Entry Helper</div>
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                  During NABL audits (ISO 15189 §7.3/7.4), historical daily record compliance is strictly checked. 
                  This utility allows simulating weeks of complete daily registers (housekeeping signatures, freezer temperatures, registration error logs) instantly.
                  <br/><br/>
                  * Temp logs will fall within the standard operating range (e.g. 20–24°C).
                  * Deep Freezer logs will sit strictly around -80°C.
                  * Checklists will automatically mark dusting/mopping as completed.
                </div>
              </div>

              {bulkSuccess && (
                <div style={{ ...S.card, padding: 16, background: "#E1F5EE", borderColor: "#5DCAA5", color: "#085041", marginBottom: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>✓ Generator Success</div>
                  <div style={{ fontSize: 12 }}>{bulkSuccess}</div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── ADD / EDIT EQUIPMENT MODAL ─────────────────── */}
      {(modal==="addEq"||modal==="editEq") && (
        <Modal title={modal==="addEq"?"Add equipment":"Edit equipment"} onClose={()=>setModal(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Equipment ID" required>
              <input style={inp} value={eqForm.id} onChange={e=>setEqForm(p=>({...p,id:e.target.value}))} placeholder="EQ016" />
            </Field>
            <Field label="Equipment name" required>
              <input style={inp} value={eqForm.name} onChange={e=>setEqForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Sysmex XN-550" />
            </Field>
            <Field label="Department">
              <select style={inp} value={eqForm.dept} onChange={e=>setEqForm(p=>({...p,dept:e.target.value}))}>
                {allDepts.map(d=><option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Equipment type">
              <select style={inp} value={eqForm.type} onChange={e=>setEqForm(p=>({...p,type:e.target.value}))}>
                {EQUIPMENT_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Calibration frequency">
              <select style={inp} value={eqForm.calFreq} onChange={e=>setEqForm(p=>({...p,calFreq:e.target.value}))}>
                {CAL_FREQS.map(f=><option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Serial number">
              <input style={inp} value={eqForm.serialNo} onChange={e=>setEqForm(p=>({...p,serialNo:e.target.value}))} placeholder="SN-XXXXXXX" />
            </Field>
            <Field label="Manufacturer">
              <input style={inp} value={eqForm.manufacturer} onChange={e=>setEqForm(p=>({...p,manufacturer:e.target.value}))} placeholder="e.g. Roche" />
            </Field>
            <Field label="Model">
              <input style={inp} value={eqForm.model} onChange={e=>setEqForm(p=>({...p,model:e.target.value}))} placeholder="e.g. cobas c 311" />
            </Field>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" }}>
            <button style={{
              padding:"7px 14px", background:"#F7F6F2", color:"#2C2C2A",
              border:"0.5px solid #D3D1C7", borderRadius:8, fontSize:12, cursor:"pointer",
            }} onClick={()=>setModal(null)}>Cancel</button>
            <button style={{
              padding:"7px 14px", background:"#0F6E56", color:"#E1F5EE",
              border:"none", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer",
            }} onClick={saveEquipment} disabled={saving}>
              {saving?"Saving…":modal==="addEq"?"Add equipment":"Save changes"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── ACCESS EDIT MODAL ──────────────────────────── */}
      {modal==="accessEdit" && selected && (
        <Modal title={`Edit access — ${selected.fullName||selected.name}`} onClose={()=>setModal(null)}>
          <div style={{
            background:"#F7F6F2", borderRadius:8, padding:"10px 14px", marginBottom:16,
          }}>
            <div style={{ fontSize:12, color:"#2C2C2A", fontWeight:500 }}>
              {selected.department} · {selected.role}
            </div>
            <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>{selected.email}</div>
          </div>

          <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", marginBottom:10 }}>
            Module access — select all that apply
          </div>

          <div style={{
            display:"grid", gridTemplateColumns:"1fr 1fr",
            gap:6, maxHeight:320, overflowY:"auto",
          }}>
            {ALL_MODULES.map(m => {
              const checked = accessForm.modules.includes(m);
              const isDefault = DEPT_PERMISSIONS[selected.department]?.[selected.role]?.modules?.includes(m);
              return (
                <label key={m} style={{
                  display:"flex", alignItems:"center", gap:8,
                  padding:"7px 10px", borderRadius:7, cursor:"pointer",
                  background: checked?"#E1F5EE":"#F7F6F2",
                  border:`0.5px solid ${checked?"#5DCAA5":"#E0DDD6"}`,
                  transition:"all 0.1s",
                }}>
                  <input type="checkbox" checked={checked}
                    onChange={() => {
                      setAccessForm(p => ({
                        ...p,
                        modules: checked
                          ? p.modules.filter(x=>x!==m)
                          : [...p.modules, m],
                      }));
                    }}
                    style={{ accentColor:"#0F6E56" }}
                  />
                  <div>
                    <div style={{ fontSize:12, color: checked?"#085041":"#5F5E5A", fontWeight: checked?500:400 }}>
                      {m}
                    </div>
                    {isDefault && (
                      <div style={{ fontSize:10, color:"#888780" }}>default for role</div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          <div style={{
            marginTop:14, padding:"8px 12px",
            background:"#FAEEDA", borderRadius:7,
            fontSize:11, color:"#633806",
          }}>
            ⚠ Custom access overrides the default role permissions for this user only.
            Changes take effect on their next login.
          </div>

          <div style={{ display:"flex", gap:8, marginTop:14, justifyContent:"space-between", alignItems:"center" }}>
            <button style={{
              padding:"6px 12px", background:"#FFF5F5", color:"#A32D2D",
              border:"0.5px solid #E24B4A", borderRadius:7, fontSize:11, cursor:"pointer",
            }} onClick={() => {
              const def = DEPT_PERMISSIONS[selected.department]?.[selected.role]?.modules||["dashboard"];
              setAccessForm({ modules:def });
            }}>
              Reset to role default
            </button>
            <div style={{ display:"flex", gap:8 }}>
              <button style={{
                padding:"7px 14px", background:"#F7F6F2", color:"#2C2C2A",
                border:"0.5px solid #D3D1C7", borderRadius:8, fontSize:12, cursor:"pointer",
              }} onClick={()=>setModal(null)}>Cancel</button>
              <button style={{
                padding:"7px 14px", background:"#3C3489", color:"#EEEDFE",
                border:"none", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer",
              }} onClick={saveAccess} disabled={saving}>
                {saving?"Saving…":"Save access"}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
