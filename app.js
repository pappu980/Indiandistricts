// Utility: Fetch JSON data (states, districts)
async function fetchData(file) {
  const res = await fetch(file);
  return await res.json();
}

// --- index.html logic ---
if (document.getElementById('stateCards')) {
  fetchData('data/states.json').then(data => {
    const grid = document.getElementById('stateCards');
    data.states.forEach(state => {
      grid.innerHTML += `
      <div class="col">
        <a href="states.html?state=${encodeURIComponent(state.stateCode)}" class="card bg-blue-100 rounded-lg shadow p-3 text-center text-blue-700 fw-bold" itemscope itemtype="https://schema.org/Place">
          <span itemprop="name">${state.state}</span><br>
          <span class="text-sm text-gray-700">Districts: ${state.districts}</span>
        </a>
      </div>`;
    });
  });
  // Search with autosuggest (districts & states)
  let allNames = [];
  fetchData('data/districts.json').then(data => {
    allNames = [...new Set(data.districts.map(d => d.district).concat(data.districts.map(d => d.state)))];
  });
  document.getElementById('searchBox').addEventListener('input', function() {
    const val = this.value.toLowerCase();
    const sugg = document.getElementById('suggestions');
    sugg.innerHTML = '';
    if (!val) return;
    allNames.filter(n => n.toLowerCase().includes(val)).slice(0, 8).forEach(n => {
      sugg.innerHTML += `<div class="p-2 cursor-pointer hover:bg-blue-100" onclick="window.location.href='district.html?name=${encodeURIComponent(n)}'">${n}</div>`;
    });
  });
}

// --- states.html logic ---
if (document.getElementById('statesGrid')) {
  fetchData('data/states.json').then(data => {
    const grid = document.getElementById('statesGrid');
    data.states.forEach(state => {
      grid.innerHTML += `
      <div class="col">
        <a href="states.html?state=${encodeURIComponent(state.stateCode)}" class="card bg-blue-100 rounded-lg shadow p-3 text-center text-blue-700 fw-bold" itemscope itemtype="https://schema.org/Place">
          <span itemprop="name">${state.state}</span><br>
          <span class="text-sm text-gray-700">Districts: ${state.districts}</span>
        </a>
      </div>`;
    });
  });
  window.filterStates = function() {
    const val = document.getElementById('stateSearch').value.toLowerCase();
    document.querySelectorAll('#statesGrid .card').forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(val) ? '' : 'none';
    });
  }
}

// --- district.html logic ---
if (location.pathname.endsWith('district.html')) {
  const params = new URLSearchParams(location.search);
  const districtName = params.get('name');
  fetchData('data/districts.json').then(data => {
    const d = data.districts.find(x => x.district.toLowerCase() === districtName?.toLowerCase());
    if (!d) return;
    document.title = `${d.district} | Indian Districts`;
    document.getElementById('districtHeader').innerHTML = `
      <h2 class="fw-bold text-blue-700">${d.district}</h2>
      <div class="text-gray-700">State: ${d.state} | Headquarters: ${d.headquarters}</div>
    `;
    document.getElementById('districtInfoCards').innerHTML = `
      <div class="col"><div class="bg-blue-100 p-3 rounded shadow text-blue-700 fw-bold">Population<br>${d.population.toLocaleString()}</div></div>
      <div class="col"><div class="bg-blue-100 p-3 rounded shadow text-blue-700 fw-bold">Area<br>${d.area} km²</div></div>
      <div class="col"><div class="bg-blue-100 p-3 rounded shadow text-blue-700 fw-bold">Density<br>${d.density} /km²</div></div>
      <div class="col"><div class="bg-blue-100 p-3 rounded shadow text-blue-700 fw-bold">Headquarters<br>${d.headquarters}</div></div>
    `;
    document.getElementById('districtOverview').innerHTML =
      `<h4 class="text-blue-700 fw-bold">Overview</h4>
       <p>${d.district} is a district of ${d.state}, headquarters at ${d.headquarters}. Population: ${d.population.toLocaleString()}, Area: ${d.area} km².</p>`;
    document.getElementById('districtDemographics').innerHTML =
      `<h4 class="text-blue-700 fw-bold">Demographics</h4>
       <ul><li>Population: ${d.population.toLocaleString()}</li><li>Area: ${d.area} km²</li><li>Density: ${d.density} /km²</li></ul>`;
    // Map - Leaflet (center on headquarters, use placeholder coords)
    const map = L.map('districtMap').setView([22.9734, 78.6569], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map);
    // Pie Chart Example
    new Chart(document.getElementById('districtPieChart').getContext('2d'), {
      type: 'pie',
      data: {
        labels: ['Urban', 'Rural'],
        datasets: [{data: [Math.round(d.population*0.4), Math.round(d.population*0.6)], backgroundColor: ['#1976d2','#42a5f5']}]
      }
    });
    // Schema.org markup
    document.getElementById('schemaDistrict').innerText = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Place",
      "name": d.district,
      "containedInPlace": d.state,
      "population": d.population,
      "area": d.area,
      "address": d.headquarters
    });
  });
}

// --- statistics.html logic ---
if (document.getElementById('statePopChart')) {
  Promise.all([
    fetchData('data/states.json'),
    fetchData('data/districts.json')
  ]).then(([states, districts]) => {
    // Calculate statistics
    const districtsByState = {};
    districts.districts.forEach(d => {
      districtsByState[d.state] = (districtsByState[d.state]||[]).concat(d);
    });
    // Total Districts
    document.getElementById('totalDistricts').innerText = districts.districts.length;
    // Avg Population/Area
    const totalPop = districts.districts.reduce((a,b) => a+b.population,0);
    const totalArea = districts.districts.reduce((a,b) => a+b.area,0);
    document.getElementById('avgPopulation').innerText = Math.round(totalPop/districts.districts.length).toLocaleString();
    document.getElementById('avgArea').innerText = Math.round(totalArea/districts.districts.length).toLocaleString() + " km²";
    // Top State by districts
    let topState = states.states.reduce((a,b) => a.districts>b.districts?a:b);
    document.getElementById('topState').innerText = topState.state;

    // Bar Chart: Population by state (sum of districts)
    let stateLabels = Object.keys(districtsByState);
    let statePop = stateLabels.map(s => districtsByState[s].reduce((a,b)=>a+b.population,0));
    new Chart(document.getElementById('statePopChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: stateLabels,
        datasets: [{
          label: 'Population',
          data: statePop,
          backgroundColor: '#1976d2'
        }]
      },
      options: {responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
    });
    // Bar Chart: Area by state
    let stateArea = stateLabels.map(s => districtsByState[s].reduce((a,b)=>a+b.area,0));
    new Chart(document.getElementById('stateAreaChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: stateLabels,
        datasets: [{
          label: 'Area (km²)',
          data: stateArea,
          backgroundColor: '#42a5f5'
        }]
      },
      options: {responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
    });
    // Area vs Population Line
    new Chart(document.getElementById('areaPopLineChart').getContext('2d'), {
      type: 'line',
      data: {
        labels: stateLabels,
        datasets: [
          {label:'Population',data:statePop, borderColor:'#1976d2', backgroundColor:'#1976d2', fill:false},
          {label:'Area',data:stateArea, borderColor:'#42a5f5', backgroundColor:'#42a5f5', fill:false}
        ]
      },
      options: {responsive:true}
    });
  });
}