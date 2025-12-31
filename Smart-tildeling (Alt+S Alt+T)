(() => {
  const BG="148, 169, 220",KS="tildelingScript_AltS",KT="tildelingScript_AltT";
  let t=null;

  const RB={
    4116:4120,8942:9041,8918:9035,8948:9043,8950:9043,8922:9034,8932:9039,
    8946:9114,8920:9035,8928:9038,8914:9031,8934:9040,8936:9040,
    8954:9045,8958:9046,8940:9041,8952:9044,8956:9045,8930:9037,
    8938:9039,8926:9038,8916:9032,8960:9046,8924:9036,8944:9042
  };
  const MO={
    8942:8943,8918:8919,8948:8949,8950:8951,8922:8923,8932:8933,
    8946:8947,8920:8921,8928:8929,8914:8915,8934:8935,8936:8937,
    8954:8955,8958:8959,8940:8941,8952:8953,8956:8957,8930:8931,
    8938:8939,8926:8927,8916:8917,8960:8961,8924:8925,8944:8945
  };

  function hasSelectedRows(){
    return [...document.querySelectorAll("tr")].some(x=>{
      const bg=getComputedStyle(x).backgroundColor;
      const id=x.id||"";
      return bg.includes(BG)&&id.startsWith("V-")&&!x.classList.contains("disabled");
    });
  }

  function disableRows(vids){
    if(typeof ListSelectionGroup!=='undefined'&&ListSelectionGroup.disableSelection){
      const elementsToDisable=vids.map(id=>'V-'+id);
      try{
        ListSelectionGroup.disableSelection(elementsToDisable,ListSelectionGroup.sourceSelectionLists[0]);
      }catch(e){
        console.warn("Kunne ikke bruke ListSelectionGroup.disableSelection:",e);
      }
    }
  }

  function refreshIfNoSelection(){
    if(!hasSelectedRows()){
      try{
        openPopp("-1");
      }catch{
        location.reload();
      }
      setTimeout(esc,100);
    }
  }

  function show(m){
    if(t&&t.parentNode)document.body.removeChild(t);
    t=document.createElement("div");
    t.innerHTML=m;
    Object.assign(t.style,{
      position:"fixed",
      background:"#ADD8E6",color:"#000",padding:"20px 30px",borderRadius:"8px",
      boxShadow:"0 4px 6px rgba(0,0,0,.3)",zIndex:1e4,fontSize:"14px",
      fontFamily:"Arial, sans-serif",maxWidth:"600px",textAlign:"left",
      lineHeight:"1.6",whiteSpace:"pre-line"
    });
    
    const col3 = document.getElementById("col3");
    if (col3) {
      const rect = col3.getBoundingClientRect();
      t.style.top = "50%";
      t.style.right = `${window.innerWidth - rect.left + 5}px`;
      t.style.left = "auto";
      t.style.transform = "translate(0%,-50%)";
    } else {
      t.style.top = "50%";
      t.style.left = "50%";
      t.style.transform = "translate(-50%,-50%)";
    }
    
    document.body.appendChild(t);
  }
  function upd(m){if(t)t.innerHTML=m;}
  function hide(d=3000){
    const x=t;if(!x)return;
    setTimeout(()=>{x.style.transition="opacity .3s";x.style.opacity="0";
      setTimeout(()=>{if(x.parentNode)x.parentNode.removeChild(x);if(t===x)t=null;},300);
    },d);
  }
  function esc(){
    document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",keyCode:27,which:27,bubbles:true,cancelable:true}));
  }

  function getCompanions(row) {
    const cells = [...row.querySelectorAll("td")];
    for (let i = 0; i < cells.length; i++) {
      const text = cells[i].textContent.trim();
      if (/^[0-9]$/.test(text)) {
        const val = parseInt(text, 10);
        if (!isNaN(val)) return val;
      }
    }
    return 0;
  }

  function parseTime(timeStr) {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
  }

  function periodsOverlap(start1, end1, start2, end2) {
    if (start1 === end1 && start2 === end2) {
      return start1 === start2;
    }
    return start1 < end2 && start2 < end1;
  }

  function countMaxOverlappingPassengers(rows) {
    const trips = [];
    
    for (const row of rows) {
      const cells = [...row.querySelectorAll("td")];
      let pickupCell, deliveryCell;
      const hasNameColumn = cells[1] && !/\d{2}:\d{2}/.test(cells[1].textContent);
      
      if (hasNameColumn) {
        pickupCell = cells[2];
        deliveryCell = cells[3];
      } else {
        pickupCell = cells[1];
        deliveryCell = cells[2];
      }
      
      const pickupTime = pickupCell ? parseTime(pickupCell.textContent.trim()) : null;
      const deliveryTime = deliveryCell ? parseTime(deliveryCell.textContent.trim()) : null;
      
      if (pickupTime === null || deliveryTime === null) continue;
      
      const companions = getCompanions(row);
      const passengers = companions + 1;
      
      trips.push({ pickupTime, deliveryTime, passengers, companions });
    }

    if (trips.length === 0) return 0;

    const timeGroups = new Map();
    
    for (const trip of trips) {
      if (trip.pickupTime === trip.deliveryTime) {
        const key = trip.pickupTime;
        if (!timeGroups.has(key)) {
          timeGroups.set(key, []);
        }
        timeGroups.get(key).push(trip);
      }
    }

    let maxOverlap = 0;

    for (const [time, group] of timeGroups.entries()) {
      let totalPassengers = 0;
      for (const trip of group) {
        totalPassengers += trip.passengers;
      }
      if (totalPassengers > maxOverlap) {
        maxOverlap = totalPassengers;
      }
    }

    for (let i = 0; i < trips.length; i++) {
      if (trips[i].pickupTime === trips[i].deliveryTime) continue;
      
      let currentOverlap = trips[i].passengers;
      
      for (let j = 0; j < trips.length; j++) {
        if (i === j) continue;
        
        if (periodsOverlap(
          trips[i].pickupTime, trips[i].deliveryTime,
          trips[j].pickupTime, trips[j].deliveryTime
        )) {
          currentOverlap += trips[j].passengers;
        }
      }
      
      if (currentOverlap > maxOverlap) {
        maxOverlap = currentOverlap;
      }
    }

    return maxOverlap;
  }

  function altT(){
    const rows=[...document.querySelectorAll("tr")].filter(x=>{
      const bg=getComputedStyle(x).backgroundColor;
      const id=x.id||"";
      return bg.includes(BG)&&id.startsWith("V-")&&!x.classList.contains("disabled");
    });
    if(!rows.length)return;
    const vids=rows.map(x=>x.getAttribute("name")).filter(Boolean);
    if(!vids.length)return;
    
    show(`Tildeler ${vids.length} bestilling${vids.length===1?'':'er'}...`);

    const fd=new URLSearchParams();
    vids.forEach(id=>fd.append("sourceList[]",id));
    
    const xhrPost=new XMLHttpRequest();
    xhrPost.open("POST","/planlegging/ajax-dispatch/assignVoppsAssist");
    xhrPost.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
    
    xhrPost.onreadystatechange=()=>{
      if(xhrPost.readyState!==4)return;
      
      if(xhrPost.status!==200){
        upd("POST-request feilet");
        hide(3000);
        return;
      }
      
      let postData;
      try{
        postData=JSON.parse(xhrPost.responseText);
      }catch(e){
        upd("Feil ved parsing av respons");
        hide(3000);
        return;
      }
      
      if(!postData.ids||postData.ids.length===0){
        upd("Ingen data returnert");
        hide(3000);
        return;
      }
      
      const utenAgreement=[];
      const medAgreement=[];
      const displayUtenAgreement=[];
      const displayMedAgreement=[];
      const vidsToDisable=[];
      
      postData.ids.forEach((item,i)=>{
        if(!item.agreementId||item.agreementId.trim()===""){
          utenAgreement.push(item);
          displayUtenAgreement.push(postData.display[i]);
        }else{
          medAgreement.push(item);
          displayMedAgreement.push(postData.display[i]);
          vidsToDisable.push(item.requisitionId);
        }
      });
      
      if(medAgreement.length===0){
        const msg=utenAgreement.length>0
          ?`Følgende bestillinger mangler avtale:\n${displayUtenAgreement.map(d=>d.requisitionName).join(', ')}`
          :"Ingen bestillinger å tildele";
        upd(msg);
        hide(3000);
        return;
      }
      
      disableRows(vidsToDisable);
      
      const idsParam=encodeURIComponent(JSON.stringify(medAgreement));
      const getUrl=`/planlegging/ajax-dispatch?did=all&action=assresassist&ids=${idsParam}`;
      
      const xhrGet=new XMLHttpRequest();
      xhrGet.open("GET",getUrl);
      xhrGet.onreadystatechange=()=>{
        if(xhrGet.readyState!==4)return;
        
        if(xhrGet.status===200){
          let msg=`✓ Tildelt ${medAgreement.length} bestilling${medAgreement.length===1?'':'er'}:\n`;
          msg+=displayMedAgreement.map(d=>`${d.requisitionName} → ${d.agreementName}`).join('\n');
          
          if(utenAgreement.length>0){
            msg+=`\n\n✗ Mangler avtale (${utenAgreement.length}):\n`;
            msg+=displayUtenAgreement.map(d=>d.requisitionName).join(', ');
          }
          
          upd(msg);
          hide(3000);
          setTimeout(()=>{refreshIfNoSelection();},1000);
        }else{
          upd("GET-request feilet");
          hide(3000);
        }
      };
      xhrGet.send();
    };
    
    xhrPost.send(fd.toString());
  }

  function altS(){
    const rows=[...document.querySelectorAll("tr")].filter(x=>{
      const bg=getComputedStyle(x).backgroundColor;
      const id=x.id||"";
      return bg.includes(BG)&&id.startsWith("V-")&&!x.classList.contains("disabled");
    });
    if(!rows.length)return;
    const vids=rows.map(x=>x.getAttribute("name")).filter(Boolean);
    
    const maxOverlappingPassengers = countMaxOverlappingPassengers(rows);
    
    show(`Tildeler ${vids.length===1?"1 bestilling":vids.length+" bestillinger"}...\nSamtidig reisende: ${maxOverlappingPassengers}`);
  
    const hasRB = rows.some(row => {
      const c = [...row.querySelectorAll("td")];
      const td = c.length >= 4 ? c[c.length - 4] : null;
      return td ? /RB|ERS/.test(td.textContent) : false;
    });
  
    const rRow=[...document.querySelectorAll("tr")].find(x=>{
      const bg=getComputedStyle(x).backgroundColor;
      const id=x.id||"";
      return bg.includes(BG)&&id.startsWith("Rxxx")&&!x.classList.contains("disabled");
    });
    if(rRow){
      disableRows(vids);
      const rid = rRow.getAttribute("name");
      const resourceNameCell = rRow.querySelectorAll("td")[1];
      const resourceName = resourceNameCell ? resourceNameCell.textContent.trim() : "Ukjent";
      const x=new XMLHttpRequest();
      x.open("GET",`/planlegging/ajax-dispatch?did=all&action=assres&rid=${rid}&vid=${encodeURIComponent(vids.join(","))}`);
      x.onreadystatechange=()=>{
        if(x.readyState!==4)return;
        upd(`${vids.length===1?"1 bestilling":vids.length+" bestillinger"} tildelt ressurs${resourceName?`: ${resourceName}`:""}`);
        hide(3000);
        refreshIfNoSelection();
      };
      x.onerror=()=>{upd("Feil");hide(3000);};
      x.send();
      return;
    }
  
    const base=vids[0];
    const fd=new URLSearchParams();fd.append("sourceList[]",base);
    const x=new XMLHttpRequest();
    x.open("POST","/planlegging/ajax-dispatch/assignVoppsAssist");
    x.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
    x.onreadystatechange=()=>{
      if(x.readyState!==4)return;
      
      if(x.status!==200){
        upd("POST-request feilet");
        hide(3000);
        return;
      }
      
      let postData;
      try{
        postData=JSON.parse(x.responseText);
      }catch(e){
        upd("Feil ved parsing av respons");
        hide(3000);
        return;
      }
      
      if(!postData.ids||postData.ids.length===0){
        upd("Ingen data returnert");
        hide(3000);
        return;
      }
      
      const j=postData,d=j.ids[0],p=j.display[0];
      
      if(!d.agreementId||d.agreementId.trim()===""){
        upd(`✗ Første bestilling (${p.requisitionName}) mangler avtale.\nKan ikke tildele.`);
        hide(5000);
        return;
      }
      
      disableRows(vids);
      
      let tid=d.agreementId,ra=false;
      
      if(hasRB&&RB[tid]){tid=RB[tid];ra=true;}
      else if(!hasRB&&maxOverlappingPassengers>3&&MO[tid]){tid=MO[tid];ra=true;}
      
      const a=new XMLHttpRequest();
      a.open("GET",`/planlegging/ajax-dispatch?did=all&action=asstrans&tid=${tid}&vid=${encodeURIComponent(vids.join(","))}`);
      a.onreadystatechange=()=>{
        if(a.readyState!==4)return;
        
        upd(ra?`${vids.length} bestillinger tildelt avtale iht. oppsett.`:`${vids.length===1?"1 bestilling":vids.length+" bestillinger"} tildelt avtale ${p.agreementName}`);
        hide(3000);
        refreshIfNoSelection();
      };
      a.onerror=()=>{upd("Feil");hide(3000);};
      a.send();
    };
    x.onerror=()=>{upd("Feil");hide(3000);};
    x.send(fd.toString());
  }

  if(!window[KS]&&!window[KT]){
    document.addEventListener("keydown",e=>{
      if(e.altKey&&e.key==="s"){e.preventDefault();altS();}
      else if(e.altKey&&e.key==="t"){e.preventDefault();altT();}
    });
    window[KS]=window[KT]=true;
  }
})();
