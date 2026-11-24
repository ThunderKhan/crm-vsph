import { useEffect, useState } from "react";
import { MemoryRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import DashboardV2Layout from "../components/v2/dashboardLayout";
import Contacts from "../pages/Contacts";
import { configurePreviewApi } from "../utils/api";
import { configurePreviewIdentity } from "../utils/session";
import { createContactPreviewStore, PREVIEW_SESSION, PREVIEW_SCENARIOS } from "./contactPreviewFixtures";

const store = createContactPreviewStore();
const options = new URLSearchParams(window.location.search);
const selected = PREVIEW_SCENARIOS.find(s=>s.id===options.get("scenario") || s.label.toLowerCase().split(" ")[0]===options.get("scenario")) || PREVIEW_SCENARIOS[0];
const initial = "/v2/contacts?contact_id="+selected.id+(options.get("contact_view")==="opportunities"?"&contact_view=opportunities":"");
const clean = options.get("clean")==="1";
configurePreviewIdentity(PREVIEW_SESSION);
configurePreviewApi(store.request);

function PreviewControls({ reset }) {
  const navigate = useNavigate();
  const [slow,setSlow] = useState(false);
  function changeDelay(event) { const next=event.target.checked; setSlow(next); store.setDelay(next?1500:250); }
  return <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2 bg-white border-b border-slate-200 text-sm text-vsph-navy">
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-semibold">Local preview</span>
      <span className="text-slate-600">Synthetic data · no backend</span><a className="text-vsph-core-blue underline" href="?scenario=reference&clean=1">Clean reference view</a>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {PREVIEW_SCENARIOS.map(s=><button type="button" key={s.id} className="min-h-[44px] px-3 border border-slate-300 rounded-md hover:bg-vsph-grey" onClick={()=>navigate("/v2/contacts?contact_id="+s.id)}>{s.label}</button>)}
      <label className="flex items-center gap-2 min-h-[44px] cursor-pointer"><input type="checkbox" className="!w-4 !min-h-0" checked={slow} onChange={changeDelay}/> Slow requests</label>
      <button type="button" className="min-h-[44px] px-3 border border-slate-300 rounded-md hover:bg-vsph-grey" onClick={()=>{store.failNextWrite();}} title="Simulate a failure on the next write; retries work normally">Fail next write</button>
      <button type="button" className="min-h-[44px] px-3 border border-vsph-navy rounded-md font-medium" onClick={reset}>Reset data</button>
    </div>
  </div>;
}
function OutsideScope() {
  return <section className="bg-white border border-slate-200 rounded-lg p-8 text-vsph-navy">
    <h1 className="text-xl font-semibold">Outside the contact preview</h1>
    <p className="mt-2 text-slate-600">Navigation uses the real CRM links. This local fixture only supports the contacts workspace; no real services have been contacted.</p>
    <Link to={initial} className="inline-flex min-h-[44px] items-center mt-4 text-vsph-core-blue underline">Return to contact preview</Link>
  </section>;
}

// Keep the isolated preview deep-linkable without replacing its MemoryRouter.
function PreviewViewUrl() {
  const location=useLocation();
  useEffect(()=>{
    const current=new URL(window.location.href);
    const view=new URLSearchParams(location.search).get("contact_view");
    if(view==="opportunities")current.searchParams.set("contact_view",view);else current.searchParams.delete("contact_view");
    if(current.href!==window.location.href)window.history.replaceState(window.history.state,"",current);
  },[location.search]);
  return null;
}

export default function ContactPreview() {
  const [version,setVersion] = useState(0);
  const reset = () => { store.reset(); setVersion(v=>v+1); };
  return <MemoryRouter key={version} initialEntries={[initial]}>
    <PreviewViewUrl/>
    <Routes>
      <Route element={<DashboardV2Layout previewBanner={clean ? null : <PreviewControls reset={reset}/>} onPreviewExit={()=>window.location.assign("/")}/>}>
        <Route path="/v2/contacts" element={<Contacts/>}/>
        <Route path="*" element={<OutsideScope/>}/>
      </Route>
    </Routes>
    <Toaster position="top-right"/>
  </MemoryRouter>;
}
