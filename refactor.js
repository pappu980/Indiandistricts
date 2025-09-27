
// Utility: Fetch JSON data (states, districts)
async function fetchData(file) {
  try {
    const res = await fetch(file);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`Error fetching data from ${file}:`, error);
    return null;
  }
}

// --- Reusable function to create state cards ---
function createStateCard(state) {
  const col = document.createElement('div');
  col.className = 'col';
  const link = document.createElement('a');
  link.href = `district.html?state=${encodeURIComponent(state.stateCode)}`;
  link.className = 'card bg-blue-100 rounded-lg shadow p-3 text-center text-blue-700 fw-bold';
  link.itemscope = true;
  link.itemtype = 'https://schema.org/Place';

  const name = document.createElement('span');
  name.itemprop = 'name';
  name.textContent = state.state;

  const districts = document.createElement('span');
  districts.className = 'text-sm text-gray-700';
  districts.textContent = `Districts: ${state.districts}`;

  link.appendChild(name);
  link.appendChild(document.createElement('br'));
  link.appendChild(districts);
  col.appendChild(link);

  return col;
}

// --- index.html logic ---
if (document.getElementById('stateCards')) {
  fetchData('data/states.json').then(data => {
    if (!data) return;
    const grid = document.getElementById('stateCards');
    grid.innerHTML = ''; // Clear existing content
    data.states.forEach(state => {
      grid.appendChild(createStateCard(state));
    });
  });

  // Search with autosuggest (districts & states)
  let allNames = [];
  Promise.all([
    fetchData('data/districts.json'),
    fetchData('data/states.json')
  ]).then(([districts, states]) => {
    if (!districts || !states) return;
    allNames = [...new Set(districts.districts.map(d => d.district).concat(states.states.map(s => s.state)))];
  });

  document.getElementById('searchBox').addEventListener('input', function() {
    const val = this.value.toLowerCase();
    const sugg = document.getElementById('suggestions');
    sugg.innerHTML = '';
    if (!val) return;
    allNames.filter(n => n.toLowerCase().includes(val)).slice(0, 8).forEach(n => {
      const div = document.createElement('div');
      div.className = 'p-2 cursor-pointer hover:bg-blue-100';
      div.textContent = n;
      div.onclick = () => {
        window.location.href = `district.html?name=${encodeURIComponent(n)}`;
      };
      sugg.appendChild(div);
    });
  });
}

// --- states.html logic ---
if (document.getElementById('statesGrid')) {
  fetchData('data/states.json').then(data => {
    if (!data) return;
    const grid = document.getElementById('statesGrid');
    grid.innerHTML = ''; // Clear existing content
    data.states.forEach(state => {
      grid.appendChild(createStateCard(state));
    });
  });

  document.getElementById('stateSearch').addEventListener('input', function() {
    const val = this.value.toLowerCase();
    document.querySelectorAll('#statesGrid .card').forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(val) ? '' : 'none';
    });
  });
}

// --- district.html logic ---
if (location.pathname.endsWith('district.html')) {
  const params = new URLSearchParams(location.search);
  const districtName = params.get('name');
  const stateCode = params.get('state'); // Added to get state code from URL

  if (districtName) {
    fetchData('data/districts.json').then(data => {
      if (!data) return;
      const d = data.districts.find(x => x.district.toLowerCase() === districtName?.toLowerCase());
      if (!d) {
          document.getElementById('districtHeader').innerHTML = `<h2 class="fw-bold text-red-700">District not found</h2>`;
          return;
      }
      renderDistrictInfo(d);
    });
  } else if (stateCode) {
    Promise.all([
        fetchData('data/districts.json'),
        fetchData('data/states.json')
    ]).then(([districts, states]) => {
        if (!districts || !states) return;
        const state = states.states.find(s => s.stateCode === stateCode);
        if (!state) return;
        const stateDistricts = districts.districts.filter(d => d.stateCode === stateCode);
        document.getElementById('districtHeader').innerHTML = `<h2 class="fw-bold text-blue-700">Districts of ${state.state}</h2>`;
        const grid = document.getElementById('districtInfoCards');
        grid.innerHTML = '';
        stateDistricts.forEach(d => {
            const col = document.createElement('div');
            col.className = 'col';
            const link = document.createElement('a');
            link.href = `district.html?name=${encodeURIComponent(d.district)}`;
            link.className = 'card bg-blue-100 rounded-lg shadow p-3 text-center text-blue-700 fw-bold';
            link.textContent = d.district;
            col.appendChild(link);
            grid.appendChild(col);
        });
    });
  }
}

function renderDistrictInfo(d) {
    document.title = `${d.district} | Indian Districts`;
    document.getElementById('districtHeader').innerHTML = `
      <h2 class="fw-bold text-blue-700">${d.district}</h2>
      <div class="text-gray-700">State: ${d.state} | Headquarters: ${d.headquarters}</div>
    `;
    const districtInfoCards = document.getElementById('districtInfoCards');
    districtInfoCards.innerHTML = ''; // Clear existing content
    const info = {
        'Population': d.population.toLocaleString(),
        'Area': `${d.area} km²`,
        'Density': `${d.density} /km²`,
        'Headquarters': d.headquarters
    };
    for(const label in info){
        const col = document.createElement('div');
        col.className = 'col';
        const card = document.createElement('div');
        card.className = 'bg-blue-100 p-3 rounded shadow text-blue-700 fw-bold';
        card.innerHTML = `${label}<br>${info[label]}`;
        col.appendChild(card);
        districtInfoCards.appendChild(col);
    }

    document.getElementById('districtOverview').innerHTML =
      `<h4 class="text-blue-700 fw-bold">Overview</h4>
       <p>${d.district} is a district of ${d.state}, headquarters at ${d.headquarters}. Population: ${d.population.toLocaleString()}, Area: ${d.area} km².</p>`;
    document.getElementById('districtDemographics').innerHTML =
      `<h4 class="text-blue-700 fw-bold">Demographics</h4>
       <ul><li>Population: ${d.population.toLocaleString()}</li><li>Area: ${d.area} km²</li><li>Density: ${d.density} /km²</li></ul>`;
    
    const placeholderNote = document.getElementById('placeholder-note');
    if (placeholderNote) {
        placeholderNote.innerHTML = `<p class="text-sm text-gray-600 mt-4"><b>Note:</b> The map and demographic chart below use placeholder data and are for demonstration purposes only.</p>`;
    }

    // Map - Leaflet (center on placeholder coords - to be improved)
    const map = L.map('districtMap').setView([22.9734, 78.6569], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map);

    // Pie Chart Example (with hardcoded data)
    new Chart(document.getElementById('districtPieChart').getContext('2d'), {
      type: 'pie',
      data: {
        labels: ['Urban', 'Rural'],
        datasets: [{data: [Math.round(d.population*0.4), Math.round(d.population*0.6)], backgroundColor: ['#1976d2','#42a5f5']}]
      }
    });

    // Schema.org markup
    document.getElementById('schemaDistrict').innerText = JSON.stringify({
      "@context": "https.schema.org",
      "@type": "Place",
      "name": d.district,
      "containedInPlace": d.state,
      "population": d.population,
      "area": d.area,
      "address": d.headquarters
    }, null, 2);
}

// --- statistics.html logic ---
if (document.getElementById('statePopChart')) {
  Promise.all([
    fetchData('data/states.json'),
    fetchData('data/districts.json')
  ]).then(([states, districts]) => {
    if (!states || !districts) return;

    // Calculate statistics
    const districtsByState = {};
    districts.districts.forEach(d => {
        if (!districtsByState[d.state]) {
            districtsByState[d.state] = [];
        }
        districtsByState[d.state].push(d);
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

    const stateLabels = Object.keys(districtsByState);
    const statePop = stateLabels.map(s => districtsByState[s].reduce((a,b)=>a+b.population,0));
    const stateArea = stateLabels.map(s => districtsByState[s].reduce((a,b)=>a+b.area,0));

    // Bar Chart: Population by state
    new Chart(document.getElementById('statePopChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: stateLabels,
        datasets: [{ label: 'Population', data: statePop, backgroundColor: '#1976d2' }]
      },
      options: {responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
    });

    // Bar Chart: Area by state
    new Chart(document.getElementById('stateAreaChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: stateLabels,
        datasets: [{ label: 'Area (km²)', data: stateArea, backgroundColor: '#42a5f5' }]
      },
      options: {responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
    });

    // Area vs Population Line Chart
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
