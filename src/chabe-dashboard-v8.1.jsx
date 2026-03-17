import { useState, useEffect } from "react";

// ─── XANO API ────────────────────────────────────────────────────────────────
// ⚠️ CORS PROXY — requis pour artifact Claude.ai
// En production (domaine propre) → remplacer par URL directe :
// const XANO_BASE = "https://x8ki-letl-twmt.n7.xano.io/api:xQZfHlSi";
const XANO_BASE = "https://corsproxy.io/?https://x8ki-letl-twmt.n7.xano.io/api:xQZfHlSi";

// Normalise un véhicule Xano → format attendu par le dashboard
function normalizeVehicle(v) {
  const locationObj = v.location || v.locations || {};
  const modelsObj   = v.models   || v.model_obj || {};
  const makesObj    = v.makes    || v.make_obj  || {};
  const isLease = locationObj.type === "lease";
  return {
    plate:           v.plate,
    make:            makesObj.name  || "",
    model:           [modelsObj.name, v.trim].filter(Boolean).join(" "),
    fuel:            v.fuel,
    extColor:        v.ext_color,
    intColor:        v.int_color,
    year:            v.year,
    vin:             v.vin,
    engineSize:      v.engine_size,
    co2:             v.co2 ? `${v.co2} g/km` : "",
    operationDate:   v.operation_date,
    status:          v.status,
    location:        isLease ? "Lease" : "Office",
    hotel:           isLease ? locationObj.name : null,
    leaseAmount:     v.lease_amount || null,
    leaseStatus:     v.lease_status || null,
    leaseEnd:        v.lease_end    || null,
    purchaseDate:    v.purchase_date,
    purchaseAmount:  v.purchase_amount,
    bank:            v.bank,
    loanAmount:      v.loan_amount,
    loanEMI:         v.loan_emi,
    loanTenure:      v.loan_tenure,
    interestRate:    v.interest_rate,
    endOfLoan:       v.end_of_loan || null,
    insurance:       v.insurance,
    insurancePayment: v.insurance_payment,
    insuranceDue:    v.insurance_due || null,
    km:              v.km || null,
    avgKmMonth:      v.avg_km_month || null,
    serviceInterval: v.service_interval || 10000,
    lastServiceKm:   v.last_service_km  || 0,
    // keep raw ids for reference
    _makesId:    v.makes_id,
    _modelsId:   v.models_id,
    _locationId: v.location_id,
  };
}

async function fetchAllVehicles() {
  const all = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${XANO_BASE}/get_vehicles?page=${page}&per_page=25`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = data.items || data;
    all.push(...items);
    if (!data.nextPage || items.length < 25) break;
    page++;
  }
  return all.map(normalizeVehicle);
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Manrope',-apple-system,sans-serif;background:#f5f5f7;color:#1d1d1f;-webkit-font-smoothing:antialiased}
  @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .fu{animation:fu .3s ease forwards}
  .d1{animation-delay:.04s;opacity:0}.d2{animation-delay:.08s;opacity:0}
  .d3{animation-delay:.12s;opacity:0}.d4{animation-delay:.16s;opacity:0}
  .g5{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
  .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .g7{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
  .hero-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px}
  .hero-stats{display:flex;gap:32px;flex-wrap:wrap}
  @media(max-width:900px){
    .g5{grid-template-columns:repeat(3,1fr)}
    .g7{grid-template-columns:repeat(4,1fr)}
    .g3{grid-template-columns:repeat(2,1fr)}
  }
  @media(max-width:640px){
    .hide-mobile{display:none!important}
    .g5{grid-template-columns:repeat(2,1fr)}
    .g4{grid-template-columns:repeat(2,1fr)}
    .g7{grid-template-columns:repeat(3,1fr)}
    .g2,.g3{grid-template-columns:1fr}
    .hero-row{flex-direction:column;align-items:flex-start}
    .hero-stats{gap:16px}
    .hero-big{font-size:34px!important}
    .main{padding:16px!important}
    .npd{padding:0 16px!important}
  }
`;

// ─── DATA ────────────────────────────────────────────────────────────────────

const DAILY_DATA = {
  "25 Fév": {
    label:"25 Fév 2026",
    drivers:{total:42,working:31,pool:20,free:11,off:8,sick:1,leave:2},
    jobs:{total:37,LT:13,LH:6,ST:7,SH:2,T:4,H:5,IT:0,IHS:0},
    // Revenue rules:
    // - horsLease = hors LT & LH (tous providers)
    // - internalRev = hors LT & LH + Internal only → used for rev/driver
    // - externalRev = hors LT & LH + External only
    revenue:{horsLease:22605, internalRev:18255, externalRev:4350,
             revPerDriver:1659, // internalRev ÷ driverFree (18255÷11)
             jobPerDriver:1.6, avgPrice:1256},
    providers:[
      {name:"Chabe Luxury Transport (DXB)", type:"Internal", rev:18255, jobs:17, pct:80.8},
      {name:"Time and Motion",              type:"External", rev:4350,  jobs:1,  pct:19.2},
    ],
    perf:[
      {name:"Shabir",          missions:1,rev:4350},
      {name:"Sumesh Soman",    missions:1,rev:3040},
      {name:"Poiyel Sackeer",  missions:1,rev:2714},
      {name:"Rajan Acharya",   missions:1,rev:2700},
      {name:"Riyas Alipetta",  missions:2,rev:2630},
      {name:"Kamran Khan",     missions:1,rev:2300},
      {name:"Kene Richard",    missions:3,rev:1100},
      {name:"MG Riju",         missions:1,rev:950},
      {name:"Naseem K.",       missions:3,rev:910},
      {name:"Shah Bilal",      missions:1,rev:460},
    ],
    // Daily = hors LT & LH only
    topClients:[
      {name:"LVMH Dubai",           rev:4600,jobs:2},
      {name:"Chabe Prestige",       rev:4350,jobs:1},
      {name:"Happy Travel",         rev:4190,jobs:3},
      {name:"Chabe Limited Dubai",  rev:3040,jobs:1},
      {name:"Four Seasons DIFC",    rev:3000,jobs:2},
      {name:"Mars Al Arab",         rev:2245,jobs:5},
      {name:"Armani Hotel Dubai",   rev:730, jobs:2},
      {name:"MAA Sustainable",      rev:450, jobs:2},
    ],
    verticals:[
      {name:"Interco",       rev:7390, jobs:2,  color:"#007aff"},
      {name:"Hotels",        rev:6425, jobs:11, color:"#34c759"},
      {name:"Luxury Brands", rev:4600, jobs:2,  color:"#af52de"},
      {name:"Travel",        rev:4190, jobs:3,  color:"#ff9500"},
    ],
    // Fleet vs demand
    fleetDemand:[
      {type:"S Class",   missions:10, need:4.0, fleet:9,  status:"ok"},
      {type:"V Class",   missions:15, need:6.0, fleet:11, status:"ok"},
      {type:"BMW 7",     missions:2,  need:0.8, fleet:4,  status:"surplus"},
      {type:"EQS",       missions:3,  need:1.2, fleet:2,  status:"tight"},
    ],
  },
  "24 Fév": {
    label:"24 Fév 2026",
    drivers:{total:42,working:31,pool:20,free:11,off:7,sick:2,leave:2},
    jobs:{total:42,LT:16,LH:4,ST:8,SH:3,T:6,H:5,IT:0,IHS:0},
    revenue:{horsLease:20010,internalRev:17200,externalRev:2810,
             revPerDriver:1564,jobPerDriver:1.9,avgPrice:1130},
    providers:[
      {name:"Chabe Luxury Transport (DXB)",type:"Internal",rev:17200,jobs:20,pct:86.0},
      {name:"Time and Motion",             type:"External",rev:2810, jobs:2, pct:14.0},
    ],
    perf:[
      {name:"Rajan Acharya",  missions:2,rev:3800},
      {name:"Shabir",         missions:1,rev:3200},
      {name:"Kamran Khan",    missions:2,rev:2900},
      {name:"Sumesh Soman",   missions:1,rev:2600},
      {name:"Riyas Alipetta", missions:1,rev:2400},
      {name:"Poiyel Sackeer", missions:2,rev:2100},
      {name:"MG Riju",        missions:1,rev:1200},
      {name:"Kene Richard",   missions:2,rev:990},
      {name:"Naseem K.",      missions:2,rev:820},
    ],
    topClients:[
      {name:"Four Seasons DIFC",   rev:4200,jobs:3},
      {name:"LVMH Dubai",          rev:3800,jobs:2},
      {name:"Happy Travel",        rev:3400,jobs:4},
      {name:"Mars Al Arab",        rev:2800,jobs:6},
      {name:"Armani Hotel Dubai",  rev:1900,jobs:3},
      {name:"Chabe Prestige",      rev:1600,jobs:1},
      {name:"Chabe Limited Dubai", rev:1310,jobs:2},
    ],
    verticals:[
      {name:"Hotels",        rev:8900,jobs:12,color:"#34c759"},
      {name:"Interco",       rev:6200,jobs:2, color:"#007aff"},
      {name:"Travel",        rev:3400,jobs:4, color:"#ff9500"},
      {name:"Luxury Brands", rev:1510,jobs:3, color:"#af52de"},
    ],
    fleetDemand:[
      {type:"S Class", missions:12,need:4.8,fleet:9, status:"tight"},
      {type:"V Class", missions:14,need:5.6,fleet:11,status:"ok"},
      {type:"BMW 7",   missions:3, need:1.2,fleet:4, status:"surplus"},
      {type:"EQS",     missions:2, need:0.8,fleet:2, status:"ok"},
    ],
  },
};

const MONTHLY_DATA = {
  "Fév 2026":{
    label:"Février 2026",
    days:Array.from({length:25},(_,i)=>i+1),
    amount:    [28907,36382,48503,53733,54499,37908,25847,23860,22315,31400,35260,36706,25090,27966,18829,19318,19282,15879,29887,34312,19250,19079,24775,20010,22605],
    jobs:      [66,62,73,75,64,83,67,65,45,57,65,88,58,76,52,68,48,46,47,70,63,62,63,42,37],
    free:      [14,17,16,19,18,18,15,15,15,15,17,15,15,16,13,15,14,14,16,17,14,15,16,11,11],
    revDriver: [1736,1673,1937,1781,2394,1495,1553,1546,1496,1827,1794,2278,1675,1593,1428,1233,1379,1036,1556,1648,1370,1136,1560,1707,1662],
    LT:[19,17,18,12,12,18,18,21,11,16,22,26,18,25,22,23,17,14,13,24,17,24,16,16,13],
    LH:[1,5,7,6,3,6,3,3,6,6,5,4,3,1,1,5,2,5,3,1,3,1,4,4,6],
    ST:[14,11,15,21,15,27,18,21,13,13,11,30,18,30,16,25,16,15,10,23,28,23,30,8,7],
    SH:[3,4,4,2,7,3,3,3,2,1,7,3,1,1,3,3,3,2,4,6,2,1,2,0,2],
    T: [25,16,16,21,13,20,22,14,9,14,13,17,10,15,8,11,6,5,7,9,10,11,8,10,4],
    H: [4,9,13,13,12,9,3,3,4,7,7,8,8,4,2,1,4,5,10,7,3,2,3,4,5],
    // Monthly billing = ALL services (LT+LH included)
    billingAccounts:[
      {name:"MAA LEASE",          rev:38200,jobs:245,hasLease:true},
      {name:"FSJ LEASE",          rev:22400,jobs:180,hasLease:true},
      {name:"FS DIFC LEASE",      rev:18600,jobs:155,hasLease:true},
      {name:"FS DIFC SHARE",      rev:12800,jobs:48, hasLease:false},
      {name:"DIOR FZE DUBAI",     rev:9200, jobs:18, hasLease:false},
      {name:"HAPPY TRAVEL",       rev:8400, jobs:22, hasLease:false},
      {name:"CHABE PRESTIGE",     rev:7600, jobs:14, hasLease:false},
      {name:"CHABE LIMITED",      rev:6100, jobs:11, hasLease:false},
      {name:"MAA SHARE",          rev:5800, jobs:19, hasLease:false},
      {name:"ARMANI HOTEL SHARE", rev:2900, jobs:8,  hasLease:false},
      {name:"MAA SUSTAINABLE",    rev:1800, jobs:7,  hasLease:false},
      {name:"MAA RESIDENCE",      rev:1200, jobs:4,  hasLease:false},
    ],
    providers:[
      {name:"Chabe Luxury Transport (DXB)",type:"Internal",rev:98400,jobs:380,pct:82.0},
      {name:"Time and Motion",             type:"External",rev:21600,jobs:62, pct:18.0},
    ],
  },
  "Jan 2026":{
    label:"Janvier 2026",
    days:Array.from({length:31},(_,i)=>i+1),
    amount:    [35000,42000,51000,48000,55000,38000,29000,25000,24000,33000,37000,39000,28000,30000,20000,21000,22000,17000,32000,36000,21000,20000,26000,22000,24000,28000,19000,23000,31000,38000,42000],
    jobs:      [70,65,78,72,68,88,70,68,50,60,68,92,62,80,55,72,52,50,52,75,66,65,66,45,40,55,44,48,65,78,68],
    free:      [15,18,17,20,19,19,16,16,16,16,18,16,16,17,14,16,15,15,17,18,15,16,17,12,13,16,13,14,17,18,15],
    revDriver: [1820,1750,2010,1850,2450,1560,1620,1610,1550,1900,1860,2350,1740,1660,1500,1300,1450,1100,1630,1720,1440,1200,1630,1790,1740,1680,1420,1580,1770,2010,2280],
    LT:[20,18,19,13,13,19,19,22,12,17,23,27,19,26,23,24,18,15,14,25,18,25,17,17,14,18,14,16,19,22,20],
    LH:[2,6,8,7,4,7,4,4,7,7,6,5,4,2,2,6,3,6,4,2,4,2,5,5,7,5,3,4,5,6,7],
    ST:[16,12,16,22,16,28,19,22,14,14,12,31,19,31,17,26,17,16,11,24,29,24,31,9,8,14,10,12,16,22,18],
    SH:[4,5,5,3,8,4,4,4,3,2,8,4,2,2,4,4,4,3,5,7,3,2,3,1,3,4,2,3,4,5,4],
    T: [22,14,14,18,11,18,20,12,8,12,11,15,9,13,7,10,5,4,6,8,9,10,7,9,4,9,7,8,12,16,13],
    H: [6,10,16,9,16,12,4,4,6,8,8,10,9,6,2,2,5,6,12,9,3,2,3,4,4,5,8,5,9,7,6],
    billingAccounts:[
      {name:"MAA LEASE",          rev:41200,jobs:260,hasLease:true},
      {name:"FSJ LEASE",          rev:24100,jobs:195,hasLease:true},
      {name:"FS DIFC LEASE",      rev:19800,jobs:162,hasLease:true},
      {name:"FS DIFC SHARE",      rev:14200,jobs:52, hasLease:false},
      {name:"HAPPY TRAVEL",       rev:9800, jobs:26, hasLease:false},
      {name:"CHABE PRESTIGE",     rev:8200, jobs:16, hasLease:false},
      {name:"DIOR FZE DUBAI",     rev:7600, jobs:14, hasLease:false},
      {name:"CHABE LIMITED",      rev:6400, jobs:12, hasLease:false},
      {name:"MAA SHARE",          rev:5200, jobs:18, hasLease:false},
      {name:"ARMANI HOTEL SHARE", rev:3100, jobs:9,  hasLease:false},
      {name:"MAA SUSTAINABLE",    rev:1900, jobs:8,  hasLease:false},
    ],
    providers:[
      {name:"Chabe Luxury Transport (DXB)",type:"Internal",rev:105200,jobs:412,pct:80.5},
      {name:"Time and Motion",             type:"External",rev:25500, jobs:75, pct:19.5},
    ],
  },
};

const ANNUAL = {
  months:["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"],
  amount2025:      [17101,31400,11835,27871,19470,4549,3293,5417,13788,22783,27419,47269],
  amount2026:      [25748,29264,null,null,null,null,null,null,null,null,null,null],
  revPerDriver2025:[1087,2047,943,1615,1338,1012,786,1468,1544,1283,1430,1621],
  revPerDriver2026:[1477,1620,null,null,null,null,null,null,null,null,null,null],
  jobs2025:        [40,50,32,62,46,23,14,20,31,43,69,68],
  jobs2026:        [63,62,null,null,null,null,null,null,null,null,null,null],
  freeAvg2025:     [14.5,13.9,11.0,14.7,12.8,5.2,5.0,4.2,8.5,13.9,16.0,16.4],
  freeAvg2026:     [15.3,15.2,null,null,null,null,null,null,null,null,null,null],
};

// Fleet database — real data from Master_Fleet.xlsx
const FLEET = [
  {plate:"L25417",make:"Mercedes Benz",model:"Maybach S680 Virgil Abloh",fuel:"Thermic",extColor:"Black",intColor:"Beige",year:2023,vin:"W1K6X7KB5PA121663",engineSize:6000,co2:"308 g/km",operationDate:"2024-01-02",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2023-09-14",purchaseAmount:1104267,bank:"InterCo",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Al Ain Ahlia",insurancePayment:40833.82,insuranceDue:"2024-12-05",km:2670,avgKmMonth:107,serviceInterval:10000,lastServiceKm:0},
  {plate:"L28794",make:"Mercedes Benz",model:"S-Class 450",fuel:"Thermic",extColor:"Black",intColor:"Black",year:2022,vin:"W1K6G6BB9NA078176",engineSize:3000,co2:"180 g/km",operationDate:"2021-11-21",status:"Operating",location:"Lease",leaseAmount:31900,hotel:"MO-J",leaseStatus:"Active",leaseEnd:"2025-06-30",purchaseDate:"2021-11-21",purchaseAmount:523761,bank:"EIB Bank",loanAmount:439960,loanEMI:10603,loanTenure:48,interestRate:0.0392,endOfLoan:"2025-11-01",insurance:"Al Ain Ahlia",insurancePayment:10662.43,insuranceDue:"2025-01-20",km:91593,avgKmMonth:1796,serviceInterval:10000,lastServiceKm:85000},
  {plate:"L29875",make:"Mercedes Benz",model:"S-Class 450",fuel:"Thermic",extColor:"Blue",intColor:"Brown",year:2022,vin:"W1K6G6BB1NA128164",engineSize:3000,co2:"180 g/km",operationDate:"2022-05-08",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2022-04-29",purchaseAmount:532380,bank:"RAK bank",loanAmount:447200,loanEMI:10871,loanTenure:48,interestRate:0.077775,endOfLoan:"2026-04-01",insurance:"The Oriental Insurance",insurancePayment:20123.25,insuranceDue:"2025-07-24",km:75758,avgKmMonth:1684,serviceInterval:10000,lastServiceKm:70000},
  {plate:"L95118",make:"Mercedes Benz",model:"S-Class 450",fuel:"Thermic",extColor:"Blue",intColor:"Brown",year:2022,vin:"W1K6G6BB1NA129802",engineSize:3000,co2:"180 g/km",operationDate:"2022-05-28",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2022-05-24",purchaseAmount:532380,bank:"RAK bank",loanAmount:503100,loanEMI:15581,loanTenure:36,interestRate:0.072,endOfLoan:"2025-05-01",insurance:"The Oriental Insurance",insurancePayment:20132.25,insuranceDue:"2025-07-26",km:78443,avgKmMonth:1783,serviceInterval:10000,lastServiceKm:75000},
  {plate:"L23269",make:"Mercedes Benz",model:"S-Class 450",fuel:"Thermic",extColor:"Blue",intColor:"Brown",year:2022,vin:"W1K6G6BB3NA129915",engineSize:3000,co2:"180 g/km",operationDate:"2022-06-07",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2022-06-07",purchaseAmount:532380,bank:"RAK bank",loanAmount:503100,loanEMI:12095,loanTenure:48,interestRate:0.072,endOfLoan:"2026-05-01",insurance:"The Oriental Insurance",insurancePayment:20123.25,insuranceDue:"2025-07-24",km:76311,avgKmMonth:1734,serviceInterval:10000,lastServiceKm:70000},
  {plate:"L21982",make:"Mercedes Benz",model:"S-Class 450",fuel:"Thermic",extColor:"Black",intColor:"Brown",year:2022,vin:"W1K6G6BB7NA131165",engineSize:3000,co2:"180 g/km",operationDate:"2022-07-27",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2022-07-30",purchaseAmount:532380,bank:"RAK bank",loanAmount:503100,loanEMI:15581,loanTenure:36,interestRate:0.072,endOfLoan:"2026-06-01",insurance:"The Oriental Insurance",insurancePayment:17808,insuranceDue:"2025-08-18",km:76705,avgKmMonth:1826,serviceInterval:10000,lastServiceKm:70000},
  {plate:"L25161",make:"Mercedes Benz",model:"S-Class 450",fuel:"Thermic",extColor:"Blue",intColor:"Brown",year:2023,vin:"W1K6G6BB1PA202752",engineSize:3000,co2:"180 g/km",operationDate:"2023-06-25",status:"Operating",location:"Lease",leaseAmount:42881,hotel:"FS-DIFC",leaseStatus:"Active",leaseEnd:"2025-06-30",purchaseDate:"2023-06-14",purchaseAmount:542957,bank:"DEEM Finance",loanAmount:370500,loanEMI:7564,loanTenure:60,interestRate:0.045,endOfLoan:"2028-06-04",insurance:"The Oriental Insurance",insurancePayment:25415.25,insuranceDue:"2025-07-31",km:43637,avgKmMonth:1364,serviceInterval:10000,lastServiceKm:40000},
  {plate:"L25158",make:"Mercedes Benz",model:"S-Class 500",fuel:"Thermic",extColor:"Black",intColor:"Brown",year:2024,vin:"W1K6G6DB0RA254843",engineSize:3000,co2:"180 g/km",operationDate:"2023-11-05",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2023-10-31",purchaseAmount:627719,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Al Ain Ahlia",insurancePayment:21010.5,insuranceDue:"2024-11-26",km:13486,avgKmMonth:499,serviceInterval:10000,lastServiceKm:10000},
  {plate:"L29740",make:"Mercedes Benz",model:"S-Class 500",fuel:"Thermic",extColor:"Black",intColor:"Brown",year:2024,vin:"W1K6G6DB4RA254036",engineSize:3000,co2:"180 g/km",operationDate:"2023-11-22",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2023-10-31",purchaseAmount:627719,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Al Ain Ahlia",insurancePayment:21010.5,insuranceDue:"2024-11-26",km:17786,avgKmMonth:659,serviceInterval:10000,lastServiceKm:10000},
  {plate:"L26080",make:"Mercedes Benz",model:"S-Class 500",fuel:"Thermic",extColor:"Black",intColor:"Brown",year:2025,vin:"W1K6G6DB3SA317441",engineSize:3000,co2:"180 g/km",operationDate:"2025-02-07",status:"Operating",location:"Lease",leaseAmount:38881,hotel:"FS-J",leaseStatus:"Active",leaseEnd:null,purchaseDate:"2025-01-30",purchaseAmount:655002,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Qatar Insurance Company",insurancePayment:null,insuranceDue:"2026-02-28",km:null,avgKmMonth:null,serviceInterval:10000,lastServiceKm:0},
  {plate:"L23717",make:"Mercedes Benz",model:"S-Class 500",fuel:"Thermic",extColor:"Black",intColor:"Brown",year:2025,vin:"W1K6G6DB0SA317333",engineSize:3000,co2:"180 g/km",operationDate:"2025-02-06",status:"Operating",location:"Lease",leaseAmount:38881,hotel:"FS-J",leaseStatus:"Active",leaseEnd:null,purchaseDate:"2025-01-30",purchaseAmount:655002,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Qatar Insurance Company",insurancePayment:null,insuranceDue:"2026-02-28",km:124684,avgKmMonth:1502,serviceInterval:10000,lastServiceKm:120000},
  {plate:"L24644",make:"Mercedes Benz",model:"S-Class 500",fuel:"Thermic",extColor:"White",intColor:"Brown",year:2025,vin:"W1K6G6DBXSA318411",engineSize:3000,co2:"180 g/km",operationDate:"2025-02-05",status:"Operating",location:"Lease",leaseAmount:38881,hotel:"FS-J",leaseStatus:"Active",leaseEnd:null,purchaseDate:"2025-01-30",purchaseAmount:655002,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Qatar Insurance Company",insurancePayment:null,insuranceDue:"2026-02-28",km:165775,avgKmMonth:3128,serviceInterval:10000,lastServiceKm:160000},
  {plate:"L72913",make:"Mercedes Benz",model:"S-Class 500",fuel:"Thermic",extColor:"Black",intColor:"Brown",year:2025,vin:"W1K6G6DB4SA317299",engineSize:3000,co2:"180 g/km",operationDate:"2025-03-14",status:"Operating",location:"Lease",leaseAmount:44665,hotel:"MAA",leaseStatus:"Active",leaseEnd:null,purchaseDate:"2025-02-25",purchaseAmount:599000,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Qatar Insurance Company",insurancePayment:null,insuranceDue:"2026-03-17",km:null,avgKmMonth:null,serviceInterval:10000,lastServiceKm:0},
  {plate:"L23872",make:"Mercedes Benz",model:"V-Class 250",fuel:"Thermic",extColor:"Black",intColor:"Black",year:2023,vin:"W1WV0LEZ1P4149488",engineSize:2000,co2:"220 g/km",operationDate:"2022-09-15",status:"Operating",location:"Lease",leaseAmount:20265,hotel:"MO-J",leaseStatus:"Active",leaseEnd:"2025-06-30",purchaseDate:"2022-09-29",purchaseAmount:238095,bank:"EIB Bank",loanAmount:225000,loanEMI:5423,loanTenure:48,interestRate:0.0392,endOfLoan:"2026-10-01",insurance:"New India Assurance",insurancePayment:4016.25,insuranceDue:"2024-10-26",km:67543,avgKmMonth:1647,serviceInterval:10000,lastServiceKm:60000},
  {plate:"L25149",make:"Mercedes Benz",model:"Vito 121 Tourer",fuel:"Thermic",extColor:"Black",intColor:"Black",year:2023,vin:"W1WV0GEZ3P4204689",engineSize:2000,co2:"200 g/km",operationDate:"2023-03-22",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2023-03-22",purchaseAmount:219047,bank:"EIB Bank",loanAmount:161000,loanEMI:3880,loanTenure:48,interestRate:0.0392,endOfLoan:"2027-03-01",insurance:"Al Ain Ahlia",insurancePayment:8557.5,insuranceDue:"2025-04-19",km:47688,avgKmMonth:1363,serviceInterval:10000,lastServiceKm:40000},
  {plate:"L25660",make:"Mercedes Benz",model:"V-Class Falcon",fuel:"Thermic",extColor:"Black",intColor:"Brown",year:2023,vin:"W1WV0LEZ8P4176039",engineSize:2000,co2:"220 g/km",operationDate:"2023-11-05",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2023-10-24",purchaseAmount:449797,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Al Ain Ahlia",insurancePayment:17067.75,insuranceDue:"2024-11-22",km:7171,avgKmMonth:266,serviceInterval:10000,lastServiceKm:0},
  {plate:"L25310",make:"Mercedes Benz",model:"V-Class Falcon",fuel:"Thermic",extColor:"Black",intColor:"Brown",year:2023,vin:"W1WV0LEZ4P4178323",engineSize:2000,co2:"220 g/km",operationDate:"2023-11-05",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2023-10-26",purchaseAmount:433333,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Al Ain Ahlia",insurancePayment:17067.75,insuranceDue:"2024-11-22",km:12647,avgKmMonth:468,serviceInterval:10000,lastServiceKm:10000},
  {plate:"L24236",make:"Mercedes Benz",model:"V-Class Falcon",fuel:"Thermic",extColor:"Black",intColor:"Brown",year:2023,vin:"W1WV0LEZ9P4176597",engineSize:2000,co2:"220 g/km",operationDate:"2023-11-05",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2023-10-31",purchaseAmount:428571,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Al Ain Ahlia",insurancePayment:16884,insuranceDue:"2024-11-26",km:9788,avgKmMonth:363,serviceInterval:10000,lastServiceKm:0},
  {plate:"L29681",make:"Mercedes Benz",model:"V-Class 250 Avantgarde",fuel:"Thermic",extColor:"Black",intColor:"Black",year:2024,vin:"W1WV0LEZ3R4258344",engineSize:2000,co2:"220 g/km",operationDate:"2023-08-23",status:"Operating",location:"Lease",leaseAmount:30000,hotel:"FS-J",leaseStatus:"Active",leaseEnd:"2025-09-30",purchaseDate:"2023-09-01",purchaseAmount:370000,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"New India Assurance",insurancePayment:6993,insuranceDue:"2024-09-23",km:18226,avgKmMonth:608,serviceInterval:10000,lastServiceKm:10000},
  {plate:"L25173",make:"Mercedes Benz",model:"V-Class 250 Avantgarde",fuel:"Thermic",extColor:"Black",intColor:"Black",year:2024,vin:"W1WV0LEZ4R4314338",engineSize:2000,co2:"220 g/km",operationDate:"2023-11-22",status:"Operating",location:"Lease",leaseAmount:30000,hotel:"FS-J",leaseStatus:"Active",leaseEnd:"2025-09-30",purchaseDate:"2023-11-07",purchaseAmount:385714,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Al Ain Ahlia",insurancePayment:15230.25,insuranceDue:"2024-12-08",km:9597,avgKmMonth:355,serviceInterval:10000,lastServiceKm:0},
  {plate:"L27891",make:"Mercedes Benz",model:"V-Class 250 Avantgarde",fuel:"Thermic",extColor:"Black",intColor:"Brown",year:2024,vin:"W1WV0LEZ6R4301672",engineSize:2000,co2:"220 g/km",operationDate:"2023-12-02",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2023-11-17",purchaseAmount:390476,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Al Ain Ahlia",insurancePayment:15414,insuranceDue:"2024-12-23",km:12384,avgKmMonth:476,serviceInterval:10000,lastServiceKm:10000},
  {plate:"L23498",make:"Mercedes Benz",model:"V-Class 250",fuel:"Thermic",extColor:"Black",intColor:"Black",year:2024,vin:"W1WV0LEZ0R4365724",engineSize:2000,co2:"220 g/km",operationDate:"2024-03-07",status:"Operating",location:"Lease",leaseAmount:22542,hotel:"BAA",leaseStatus:"Active",leaseEnd:"2026-03-15",purchaseDate:"2024-02-28",purchaseAmount:360000,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Al Ain Ahlia",insurancePayment:13577,insuranceDue:"2025-03-26",km:null,avgKmMonth:null,serviceInterval:10000,lastServiceKm:0},
  {plate:"L25673",make:"Mercedes Benz",model:"V-Class 250",fuel:"Thermic",extColor:"Black",intColor:"Black",year:2024,vin:"W1WV0LEZ0R4364153",engineSize:2000,co2:"220 g/km",operationDate:"2024-03-07",status:"Operating",location:"Lease",leaseAmount:22542,hotel:"BAA",leaseStatus:"Active",leaseEnd:"2026-03-15",purchaseDate:"2024-02-28",purchaseAmount:360000,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Al Ain Ahlia",insurancePayment:13577,insuranceDue:"2025-03-26",km:null,avgKmMonth:null,serviceInterval:10000,lastServiceKm:0},
  {plate:"L69535",make:"Mercedes Benz",model:"V-Class Falcon",fuel:"Thermic",extColor:"Black",intColor:"Brown",year:2024,vin:"W1WV0LEZ2R4307694",engineSize:2000,co2:"220 g/km",operationDate:"2025-03-01",status:"Operating",location:"Lease",leaseAmount:35374,hotel:"MAA",leaseStatus:"Active",leaseEnd:null,purchaseDate:"2025-02-25",purchaseAmount:499000,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Qatar Insurance Company",insurancePayment:null,insuranceDue:"2026-03-17",km:null,avgKmMonth:null,serviceInterval:10000,lastServiceKm:0},
  {plate:"L25144",make:"Mercedes Benz",model:"EQS 450+",fuel:"Electric",extColor:"Black",intColor:"Beige",year:2023,vin:"W1KCG2DB5PA027642",engineSize:"Electric",co2:"0 g/km",operationDate:"2023-05-15",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2023-05-15",purchaseAmount:589000,bank:"EIB Bank",loanAmount:439000,loanEMI:10580,loanTenure:48,interestRate:0.0392,endOfLoan:"2027-04-19",insurance:"The Oriental Insurance",insurancePayment:27876.59,insuranceDue:"2025-07-24",km:12750,avgKmMonth:386,serviceInterval:20000,lastServiceKm:0},
  {plate:"L25156",make:"Mercedes Benz",model:"EQS 450+",fuel:"Electric",extColor:"Black",intColor:"Brown",year:2023,vin:"W1KCG2DB7PA026816",engineSize:"Electric",co2:"0 g/km",operationDate:"2023-06-25",status:"Operating",location:"Lease",leaseAmount:48266,hotel:"MO-J",leaseStatus:"Active",leaseEnd:"2025-06-30",purchaseDate:"2023-06-14",purchaseAmount:561052,bank:"DEEM Finance",loanAmount:382850,loanEMI:7817,loanTenure:60,interestRate:0.045,endOfLoan:"2028-06-04",insurance:"The Oriental Insurance",insurancePayment:26253.16,insuranceDue:"2025-07-31",km:35830,avgKmMonth:1120,serviceInterval:20000,lastServiceKm:20000},
  {plate:"L26082",make:"BMW",model:"735i Excellence",fuel:"Thermic",extColor:"White",intColor:"Brown",year:2024,vin:"WBA11EH09RCR28367",engineSize:3000,co2:"174 g/km",operationDate:"2024-03-13",status:"Operating",location:"Lease",leaseAmount:26000,hotel:"BAA",leaseStatus:"Active",leaseEnd:"2026-03-15",purchaseDate:"2024-03-05",purchaseAmount:471000,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Al Ain Ahlia",insurancePayment:24980,insuranceDue:"2025-04-06",km:null,avgKmMonth:null,serviceInterval:15000,lastServiceKm:0},
  {plate:"L26081",make:"BMW",model:"735i Excellence",fuel:"Thermic",extColor:"White",intColor:"Brown",year:2024,vin:"WBA11EH09RCR28546",engineSize:3000,co2:"174 g/km",operationDate:"2024-03-13",status:"Operating",location:"Lease",leaseAmount:26000,hotel:"BAA",leaseStatus:"Active",leaseEnd:"2026-03-15",purchaseDate:"2024-03-05",purchaseAmount:471000,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Al Ain Ahlia",insurancePayment:24980,insuranceDue:"2025-04-06",km:null,avgKmMonth:null,serviceInterval:15000,lastServiceKm:0},
  {plate:"L22082",make:"BMW",model:"i7 M60",fuel:"Electric",extColor:"White",intColor:"Brown",year:2024,vin:"WBY51EJ06RCN95445",engineSize:"Electric",co2:"0 g/km",operationDate:"2023-12-21",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2023-11-30",purchaseAmount:690000,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Al Ain Ahlia",insurancePayment:25609.5,insuranceDue:"2025-01-04",km:6817,avgKmMonth:262,serviceInterval:20000,lastServiceKm:0},
  {plate:"L25784",make:"BMW",model:"i7 M60",fuel:"Electric",extColor:"Black",intColor:"Brown",year:2024,vin:"WBY51EJ03RCN97119",engineSize:"Electric",co2:"0 g/km",operationDate:"2023-12-12",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2023-12-08",purchaseAmount:690000,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"Al Ain Ahlia",insurancePayment:25609.5,insuranceDue:"2025-01-10",km:null,avgKmMonth:null,serviceInterval:20000,lastServiceKm:0},
  {plate:"L22197",make:"BMW",model:"520i Excellence",fuel:"Thermic",extColor:"Black",intColor:"Red",year:2024,vin:"WBA11FJ09RCR47310",engineSize:2000,co2:"145 g/km",operationDate:"2024-06-29",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2024-04-30",purchaseAmount:260000,bank:"Cash",loanAmount:0,loanEMI:0,loanTenure:0,interestRate:0,endOfLoan:null,insurance:"The Oriental Insurance",insurancePayment:14611,insuranceDue:"2025-07-13",km:13000,avgKmMonth:null,serviceInterval:15000,lastServiceKm:0},
  {plate:"L29741",make:"Chevrolet",model:"Suburban LS",fuel:"Thermic",extColor:"Black",intColor:"Black",year:2021,vin:"1GNSK9ED3MR288270",engineSize:5300,co2:"330 g/km",operationDate:"2021-10-18",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2021-10-12",purchaseAmount:196500,bank:"RAK bank",loanAmount:165060,loanEMI:3977,loanTenure:48,interestRate:0.0732,endOfLoan:"2025-10-01",insurance:"Al Ain Ahlia",insurancePayment:4730.91,insuranceDue:"2024-11-23",km:84109,avgKmMonth:1617,serviceInterval:10000,lastServiceKm:80000},
  {plate:"L29673",make:"Cadillac",model:"Escalade ESV",fuel:"Thermic",extColor:"Black",intColor:"Brown",year:2021,vin:"IGYS48KL5MR470510",engineSize:6200,co2:"380 g/km",operationDate:"2021-11-18",status:"Operating",location:"Lease",leaseAmount:29871,hotel:"FS-J",leaseStatus:"Active",leaseEnd:"2024-05-31",purchaseDate:"2021-11-16",purchaseAmount:420952,bank:"RAK bank",loanAmount:369070,loanEMI:8893,loanTenure:48,interestRate:0.0732,endOfLoan:"2025-11-01",insurance:"Al Ain Ahlia",insurancePayment:8729.31,insuranceDue:"2025-01-20",km:84502,avgKmMonth:1657,serviceInterval:10000,lastServiceKm:80000},
  {plate:"L29677",make:"Audi",model:"A6 40 TFSI",fuel:"Thermic",extColor:"White",intColor:"Brown",year:2022,vin:"WAUZZZF26NN009030",engineSize:2000,co2:"159 g/km",operationDate:"2021-10-06",status:"Operating",location:"Office",leaseAmount:null,hotel:null,leaseStatus:null,leaseEnd:null,purchaseDate:"2021-10-09",purchaseAmount:170476,bank:"RAK bank",loanAmount:143200,loanEMI:3481,loanTenure:48,interestRate:0.0764,endOfLoan:"2025-09-01",insurance:"Al Ain Ahlia",insurancePayment:4245.94,insuranceDue:"2024-11-22",km:128648,avgKmMonth:2474,serviceInterval:10000,lastServiceKm:120000},
];

const DAILY_DATES   = Object.keys(DAILY_DATA);
const MONTHLY_KEYS  = Object.keys(MONTHLY_DATA);

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt  = n => n!=null ? Number(n).toLocaleString("fr-FR",{maximumFractionDigits:0}) : "—";
const fmtK = n => n!=null ? `${(n/1000).toFixed(0)}k` : "—";
const pct  = (a,b) => b&&b>0 ? ((a-b)/b*100).toFixed(1) : null;
const avg  = arr => { const v=arr.filter(x=>x!=null); return v.length?Math.round(v.reduce((s,x)=>s+x,0)/v.length):0; };
const sum  = arr => arr.filter(x=>x!=null).reduce((s,x)=>s+x,0);

// ─── SHARED UI ───────────────────────────────────────────────────────────────
function Kpi({label,value,sub,color,small=false}){
  const cols={default:"#1d1d1f",green:"#34c759",blue:"#007aff",red:"#ff3b30",orange:"#ff9500",purple:"#af52de",yellow:"#ffd60a"};
  return(
    <div style={{background:"#fff",borderRadius:14,padding:"16px 18px",boxShadow:"0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)"}}>
      <div style={{fontSize:11,fontWeight:600,color:"#86868b",marginBottom:6}}>{label}</div>
      <div style={{fontSize:small?20:28,fontWeight:800,color:cols[color]||cols.default,lineHeight:1,letterSpacing:"-0.5px"}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"#86868b",marginTop:5}}>{sub}</div>}
    </div>
  );
}

function Sec({children,mt=28}){
  return <div style={{fontSize:11,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"#86868b",marginBottom:10,marginTop:mt}}>{children}</div>;
}

function Card({children,style={}}){
  return <div style={{background:"#fff",borderRadius:16,padding:"18px 20px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",...style}}>{children}</div>;
}

function PeriodSelector({items,selected,onSelect}){
  return(
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
      {items.map(item=>(
        <button key={item} onClick={()=>onSelect(item)} style={{
          background:selected===item?"#1d1d1f":"#fff",
          color:selected===item?"#fff":"#86868b",
          border:`1px solid ${selected===item?"#1d1d1f":"#e5e5e5"}`,
          borderRadius:20,padding:"6px 14px",fontSize:12,fontWeight:selected===item?700:500,
          cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",
          boxShadow:selected===item?"0 2px 8px rgba(0,0,0,0.15)":"none",
        }}>{item}</button>
      ))}
    </div>
  );
}

function BarChart({data,labels,color="#007aff",height=120}){
  const valid=data.filter(v=>v!=null);
  const max=Math.max(...valid,1);
  const n=data.length;
  const W=Math.max(500,n*24+40);
  const bw=Math.max(6,Math.floor((W-40)/n*0.6));
  return(
    <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      <svg width={W} height={height+30} style={{display:"block"}}>
        {data.map((v,i)=>{
          if(v==null) return null;
          const h=Math.round((v/max)*(height-8));
          const x=20+i*(W-40)/(n-1||1)-bw/2;
          return(
            <g key={i}>
              <rect x={x} y={height-h} width={bw} height={h} rx={3} fill={color} opacity={0.85}/>
              {(i===0||(i+1)%5===0||i===n-1)&&<text x={x+bw/2} y={height+16} textAnchor="middle" fontSize={9} fill="#86868b">{labels[i]}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LineChart({data,labels,color="#34c759",height=110}){
  const valid=data.map((v,i)=>({v,i})).filter(d=>d.v!=null);
  if(valid.length<2) return null;
  const max=Math.max(...valid.map(d=>d.v),1);
  const min=Math.min(...valid.map(d=>d.v));
  const n=data.length;
  const W=Math.max(500,n*24+40);
  const pts=valid.map(d=>{
    const x=20+d.i*(W-40)/(n-1||1);
    const y=8+(1-(d.v-min)/(max-min||1))*(height-16);
    return `${x},${y}`;
  }).join(" ");
  return(
    <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      <svg width={W} height={height+28} style={{display:"block"}}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"/>
        {valid.map((d,ii)=>{
          const x=20+d.i*(W-40)/(n-1||1);
          const y=8+(1-(d.v-min)/(max-min||1))*(height-16);
          return(
            <g key={ii}>
              <circle cx={x} cy={y} r={3.5} fill="#fff" stroke={color} strokeWidth={2}/>
              {(d.i===0||(d.i+1)%5===0||d.i===n-1)&&<text x={x} y={height+20} textAnchor="middle" fontSize={9} fill="#86868b">{labels[d.i]}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DualBar({data2025,data2026,labels,height=140,selectedIdx=null}){
  const all=[...data2025.filter(v=>v!=null),...data2026.filter(v=>v!=null)];
  const max=Math.max(...all,1);
  const bw=16,gap=3,grpW=bw*2+gap+14;
  const W=Math.max(500,labels.length*grpW+60);
  return(
    <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      <svg width={W} height={height+52} style={{display:"block"}}>
        <rect x={20} y={8} width={10} height={8} rx={2} fill="#86868b" opacity={0.4}/>
        <text x={34} y={16} fontSize={10} fill="#86868b">2025</text>
        <rect x={76} y={8} width={10} height={8} rx={2} fill="#007aff"/>
        <text x={90} y={16} fontSize={10} fill="#86868b">2026</text>
        {labels.map((lbl,i)=>{
          const x=20+i*grpW;
          const h25=data2025[i]!=null?Math.round((data2025[i]/max)*(height-20)):0;
          const h26=data2026[i]!=null?Math.round((data2026[i]/max)*(height-20)):0;
          const isSel=selectedIdx===i;
          const base=height+22;
          return(
            <g key={i}>
              {isSel&&<rect x={x-4} y={26} width={bw*2+gap+8} height={height-6} rx={4} fill="#007aff" opacity={0.06}/>}
              {h25>0&&<rect x={x} y={base-h25} width={bw} height={h25} rx={3} fill="#86868b" opacity={isSel?0.8:0.4}/>}
              {h26>0&&<rect x={x+bw+gap} y={base-h26} width={bw} height={h26} rx={3} fill="#007aff" opacity={isSel?1:0.7}/>}
              <text x={x+bw} y={base+14} textAnchor="middle" fontSize={9} fill={isSel?"#1d1d1f":"#86868b"} fontWeight={isSel?700:400}>{lbl}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DrvRow({d,rank,max}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f5f5f7"}}>
      <div style={{width:26,height:26,borderRadius:7,flexShrink:0,background:rank<=3?"#1d1d1f":"#f5f5f7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:rank<=3?"#fff":"#86868b"}}>{rank}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
        <div style={{background:"#f5f5f7",height:3,borderRadius:2}}>
          <div style={{width:`${Math.round(d.rev/max*100)}%`,height:"100%",borderRadius:2,background:rank<=3?"#1d1d1f":"#d1d1d6"}}/>
        </div>
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontSize:13,fontWeight:700}}>{fmt(d.rev)}</div>
        <div style={{fontSize:10,color:"#86868b"}}>{d.missions} mission{d.missions>1?"s":""}</div>
      </div>
    </div>
  );
}

function JobPill({label,count,color}){
  return(
    <div style={{background:"#fff",borderRadius:12,padding:"12px 6px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
      <div style={{fontSize:10,fontWeight:700,color:color||"#86868b"}}>{label}</div>
      <div style={{fontSize:22,fontWeight:800,color:"#1d1d1f",lineHeight:1}}>{count}</div>
    </div>
  );
}

// ─── UPLOAD BAR ───────────────────────────────────────────────────────────────
function UploadBar(){
  return(
    <div style={{background:"#fff",borderBottom:"1px solid rgba(0,0,0,0.06)"}}>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"10px 32px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        {[{icon:"📅",label:"Planning dispatch"},{icon:"💰",label:"Export PowerBI"}].map(item=>(
          <label key={item.label} style={{display:"flex",alignItems:"center",gap:6,background:"#f5f5f7",border:"1px dashed #d1d1d6",borderRadius:10,padding:"7px 12px",cursor:"pointer",fontSize:13,fontWeight:500,color:"#86868b"}}>
            <span>{item.icon}</span><span style={{whiteSpace:"nowrap"}}>{item.label}</span>
            <input type="file" style={{display:"none"}}/>
          </label>
        ))}
        <button style={{background:"#1d1d1f",color:"#fff",border:"none",borderRadius:10,padding:"7px 18px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Analyser</button>
        <span style={{fontSize:11,color:"#86868b",fontStyle:"italic"}}>Données réelles · Fév 2026</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DAILY VIEW
// ═══════════════════════════════════════════════════════════════════════════
function DailyView(){
  const [sel,setSel]=useState(DAILY_DATES[0]);
  const d=DAILY_DATA[sel];
  const {drivers,jobs,revenue,perf,topClients,verticals,providers,fleetDemand}=d;
  const horsLease=jobs.total-jobs.LT-jobs.LH;
  const maxRev=perf[0]?.rev||1;
  const maxClient=topClients[0]?.rev||1;
  const totalVertRev=sum(verticals.map(v=>v.rev));
  const pctExternal=(revenue.externalRev/revenue.horsLease*100).toFixed(1);

  return(
    <div>
      <Sec mt={0}>Sélectionner un jour</Sec>
      <PeriodSelector items={DAILY_DATES} selected={sel} onSelect={setSel}/>

      <Sec mt={20}>Chauffeurs · {d.label}</Sec>
      <div className="g5 fu d1">
        <Kpi label="Total drivers" value={drivers.total}/>
        <Kpi label="Présents" value={drivers.working} color="green" sub={`${Math.round(drivers.working/drivers.total*100)}% disponibles`}/>
        <Kpi label="Driver Free" value={drivers.free} color="blue"/>
        <Kpi label="Driver Pool" value={drivers.pool}/>
        <Kpi label="Absents" value={drivers.off+drivers.sick+drivers.leave} color="red" sub={`${drivers.off} off · ${drivers.sick} sick · ${drivers.leave} leave`}/>
      </div>

      <Sec>Revenue journalier</Sec>
      <div className="fu d2" style={{background:"#1d1d1f",borderRadius:20,padding:"24px 28px",marginBottom:10,boxShadow:"0 4px 24px rgba(0,0,0,0.12)"}}>
        <div className="hero-row">
          <div>
            <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.4)",letterSpacing:"1px",textTransform:"uppercase",marginBottom:6}}>CA Hors LT & LH</div>
            <div className="hero-big" style={{fontSize:48,fontWeight:800,color:"#fff",lineHeight:1,letterSpacing:"-2px"}}>
              {fmt(revenue.horsLease)} <span style={{fontSize:15,fontWeight:500,color:"rgba(255,255,255,0.4)"}}>AED</span>
            </div>
          </div>
          <div className="hero-stats">
            {[
              {label:"Rev / Driver Free*",value:`${fmt(revenue.revPerDriver)} AED`},
              {label:"Job / Driver Free",  value:revenue.jobPerDriver},
              {label:"Prix moyen / job",   value:`${fmt(revenue.avgPrice)} AED`},
            ].map(s=>(
              <div key={s.label}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:500,marginBottom:4}}>{s.label}</div>
                <div style={{fontSize:20,fontWeight:700,color:"#fff"}}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.08)",fontSize:10,color:"rgba(255,255,255,0.3)"}}>
          * Rev / Driver Free = Internal seulement ({fmt(revenue.internalRev)} AED) ÷ {drivers.free} free drivers
        </div>
      </div>

      <div className="g4 fu d2">
        <Kpi label="Jobs hors lease" value={horsLease} color="green" sub={`${Math.round(horsLease/jobs.total*100)}% du total`}/>
        <Kpi label="Revenue internal" value={`${fmt(revenue.internalRev)} AED`} color="blue" sub="Chabe Luxury"/>
        <Kpi label="Revenue external" value={`${fmt(revenue.externalRev)} AED`} color="orange" sub={`${pctExternal}% sous-traitance`}/>
        <Kpi label="LT + LH" value={jobs.LT+jobs.LH} color="orange" sub="facturé mensuellement"/>
      </div>

      {/* SOUS-TRAITANCE */}
      <Sec>Sous-traitance</Sec>
      <Card className="fu d2">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:13,fontWeight:700}}>Répartition par prestataire</div>
            <div style={{fontSize:11,color:"#86868b"}}>Hors LT & LH · {d.label}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:700,color:"#007aff"}}>{100-parseFloat(pctExternal)}% Interne</span>
            <span style={{fontSize:12,color:"#86868b"}}>·</span>
            <span style={{fontSize:12,fontWeight:700,color:"#ff9500"}}>{pctExternal}% Externe</span>
          </div>
        </div>
        {providers.map((p,i)=>(
          <div key={p.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<providers.length-1?"1px solid #f5f5f7":"none"}}>
            <div style={{flexShrink:0}}>
              <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:p.type==="Internal"?"rgba(0,122,255,0.1)":"rgba(255,149,0,0.1)",color:p.type==="Internal"?"#007aff":"#ff9500"}}>
                {p.type==="Internal"?"INTERNE":"EXTERNE"}
              </span>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
              <div style={{background:"#f5f5f7",height:4,borderRadius:2}}>
                <div style={{width:`${p.pct}%`,height:"100%",borderRadius:2,background:p.type==="Internal"?"#007aff":"#ff9500"}}/>
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:13,fontWeight:700}}>{fmt(p.rev)} AED</div>
              <div style={{fontSize:10,color:"#86868b"}}>{p.jobs} jobs · {p.pct}%</div>
            </div>
          </div>
        ))}
      </Card>

      {/* FLEET VS DEMAND */}
      <Sec>Besoins flotte vs disponible</Sec>
      <Card className="fu d3">
        <div style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>Analyse capacité · règle 2.5 missions/véhicule</div>
          <div style={{fontSize:11,color:"#86868b"}}>Missions (hors lease) ÷ 2.5 = véhicules nécessaires · comparé à flotte office</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
          {fleetDemand.map(f=>{
            const status=f.fleet>=f.need?"ok":f.fleet>=f.need*0.8?"tight":"under";
            const statusColor=status==="ok"?"#34c759":status==="tight"?"#ff9500":"#ff3b30";
            const statusLabel=status==="ok"?"✓ OK":status==="tight"?"⚠ Limite":"✗ Insuffisant";
            const surplus=f.fleet>f.need?`+${(f.fleet-f.need).toFixed(1)} en surplus`:null;
            return(
              <div key={f.type} style={{background:"#f5f5f7",borderRadius:12,padding:"14px 16px",borderLeft:`3px solid ${statusColor}`}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>{f.type}</div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,color:"#86868b"}}>Missions</span>
                  <span style={{fontSize:12,fontWeight:600}}>{f.missions}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,color:"#86868b"}}>Besoin (÷2.5)</span>
                  <span style={{fontSize:12,fontWeight:600}}>{f.need}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:11,color:"#86868b"}}>Flotte office</span>
                  <span style={{fontSize:12,fontWeight:700}}>{f.fleet}</span>
                </div>
                <div style={{fontSize:11,fontWeight:700,color:statusColor}}>{statusLabel}</div>
                {surplus&&<div style={{fontSize:10,color:"#86868b",marginTop:2}}>{surplus} → envisager cession</div>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* SERVICE TYPES */}
      <Sec>Par type de service</Sec>
      <div className="g7 fu d3">
        {[{l:"LT",c:jobs.LT,col:"#ff9500"},{l:"LH",c:jobs.LH,col:"#ff9500"},{l:"ST",c:jobs.ST,col:"#007aff"},{l:"SH",c:jobs.SH,col:"#007aff"},{l:"T",c:jobs.T,col:"#34c759"},{l:"H",c:jobs.H,col:"#34c759"},{l:"IT/IHS",c:jobs.IT+jobs.IHS,col:"#86868b"}].map(j=>(
          <JobPill key={j.l} label={j.l} count={j.c} color={j.col}/>
        ))}
      </div>

      {/* CLIENTS + VERTICALS */}
      <Sec>Clients & Industries · hors LT & LH</Sec>
      <div className="g2 fu d3">
        <Card>
          <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>Top clients</div>
          <div style={{fontSize:11,color:"#86868b",marginBottom:16}}>Billing Account · hors LT & LH</div>
          {topClients.map((c,i)=>(
            <div key={c.name} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #f5f5f7"}}>
              <div style={{width:22,height:22,borderRadius:6,flexShrink:0,background:i<3?"#1d1d1f":"#f5f5f7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:i<3?"#fff":"#86868b"}}>{i+1}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>{c.name}</div>
                <div style={{background:"#f5f5f7",height:3,borderRadius:2}}>
                  <div style={{width:`${Math.round(c.rev/maxClient*100)}%`,height:"100%",borderRadius:2,background:i<3?"#1d1d1f":"#d1d1d6"}}/>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:12,fontWeight:700}}>{fmt(c.rev)}</div>
                <div style={{fontSize:10,color:"#86868b"}}>{c.jobs} jobs</div>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>Par industrie</div>
          <div style={{fontSize:11,color:"#86868b",marginBottom:16}}>Vertical · Revenue AED</div>
          {verticals.map(v=>(
            <div key={v.name} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:v.color,flexShrink:0}}/>
                  <span style={{fontSize:13,fontWeight:600}}>{v.name}</span>
                  <span style={{fontSize:10,fontWeight:700,background:`${v.color}18`,color:v.color,padding:"2px 7px",borderRadius:4}}>{v.jobs} jobs</span>
                </div>
                <span style={{fontSize:13,fontWeight:700}}>{fmt(v.rev)} <span style={{fontSize:10,fontWeight:500,color:"#86868b"}}>AED</span></span>
              </div>
              <div style={{background:"#f5f5f7",height:6,borderRadius:3}}>
                <div style={{width:`${Math.round(v.rev/totalVertRev*100)}%`,height:"100%",borderRadius:3,background:v.color}}/>
              </div>
              <div style={{fontSize:10,color:"#86868b",marginTop:3}}>{Math.round(v.rev/totalVertRev*100)}% du CA hors lease</div>
            </div>
          ))}
        </Card>
      </div>

      {/* DRIVER PERF */}
      <Sec>Performance chauffeurs · Internal seulement</Sec>
      <div className="g2 fu d4">
        <Card>
          <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>Top performers</div>
          <div style={{fontSize:11,color:"#86868b",marginBottom:14}}>Chabe Luxury Transport · hors LT & LH</div>
          {perf.slice(0,5).map((d,i)=><DrvRow key={d.name} d={d} rank={i+1} max={maxRev}/>)}
        </Card>
        <Card>
          <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>Suite du classement</div>
          <div style={{fontSize:11,color:"#86868b",marginBottom:14}}>Chauffeurs actifs</div>
          {perf.slice(5).map((d,i)=><DrvRow key={d.name} d={d} rank={i+6} max={maxRev}/>)}
          <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid #f5f5f7",fontSize:12,color:"#86868b"}}>
            <span style={{color:"#1d1d1f",fontWeight:600}}>{Math.max(0,drivers.free-perf.length)}</span> Driver Free sans mission
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MONTHLY VIEW
// ═══════════════════════════════════════════════════════════════════════════
function MonthlyView(){
  const [sel,setSel]=useState(MONTHLY_KEYS[0]);
  const m=MONTHLY_DATA[sel];
  const totalRev=sum(m.amount);
  const totalJobs=sum(m.jobs);
  const totalLT=sum(m.LT),totalLH=sum(m.LH);
  const totalHL=totalJobs-totalLT-totalLH;
  const avgFree=avg(m.free);
  const avgRpd=avg(m.revDriver);
  const labels=m.days.map(d=>String(d));
  const byType={LT:totalLT,LH:totalLH,ST:sum(m.ST),SH:sum(m.SH),T:sum(m.T),H:sum(m.H)};
  const totalBA=sum(m.billingAccounts.map(b=>b.rev));
  const maxBA=m.billingAccounts[0]?.rev||1;
  const internalPct=m.providers.find(p=>p.type==="Internal")?.pct||0;

  // ── FLEET VS DEMAND (monthly) ──────────────────────────────────────────
  const nbDays = m.days.length;
  const fleetOffice = FLEET.filter(v=>v.location==="Office").length;

  const missionsST = sum(m.ST)+sum(m.SH);
  const missionsT  = sum(m.T);
  const missionsH  = sum(m.H);
  const totalHorsLease = missionsST + missionsT + missionsH;
  const besoinTotal    = Math.ceil(totalHorsLease / (nbDays * 2.5));

  const prevKey  = MONTHLY_KEYS[MONTHLY_KEYS.indexOf(sel)+1];
  const prevM    = prevKey ? MONTHLY_DATA[prevKey] : null;
  const prevDays = prevM ? prevM.days.length : nbDays;
  const prevHL   = prevM ? sum(prevM.ST)+sum(prevM.SH)+sum(prevM.T)+sum(prevM.H) : null;
  const prevBesoin = prevHL!=null ? Math.ceil(prevHL/(prevDays*2.5)) : null;
  const diff = prevBesoin!=null ? besoinTotal - prevBesoin : null;
  const surplus = fleetOffice - besoinTotal;

  const fleetRows = [
    {
      cat:"S Class / Sedan",
      missions: missionsST,
      besoin: Math.ceil(missionsST/(nbDays*2.5)),
      dispo: FLEET.filter(v=>v.location==="Office"&&(v.model.toLowerCase().includes("s-class")||v.model.toLowerCase().includes("maybach")||v.model.toLowerCase().includes("a6"))).length,
      prevMissions: prevM ? sum(prevM.ST)+sum(prevM.SH) : null,
    },
    {
      cat:"V Class / Vito",
      missions: missionsT,
      besoin: Math.ceil(missionsT/(nbDays*2.5)),
      dispo: FLEET.filter(v=>v.location==="Office"&&(v.model.toLowerCase().includes("v-class")||v.model.toLowerCase().includes("vito")||v.model.toLowerCase().includes("falcon"))).length,
      prevMissions: prevM ? sum(prevM.T) : null,
    },
    {
      cat:"EQS / i7 Electrique",
      missions: missionsH,
      besoin: Math.ceil(missionsH/(nbDays*2.5)),
      dispo: FLEET.filter(v=>v.location==="Office"&&v.fuel==="Electric").length,
      prevMissions: prevM ? sum(prevM.H) : null,
    },
    {
      cat:"SUV (Suburban / Escalade)",
      missions: 0,
      besoin: 0,
      dispo: FLEET.filter(v=>v.location==="Office"&&(v.model.toLowerCase().includes("suburban")||v.model.toLowerCase().includes("escalade"))).length,
      prevMissions: 0,
    },
  ];

  return(
    <div>
      <Sec mt={0}>Sélectionner un mois</Sec>
      <PeriodSelector items={MONTHLY_KEYS} selected={sel} onSelect={setSel}/>

      <Sec mt={20}>Résumé — {m.label}</Sec>
      <div className="g4 fu d1">
        <Kpi label="Revenue total" value={`${fmtK(totalRev)} AED`} color="blue" sub="tous services inclus"/>
        <Kpi label="Missions hors lease" value={totalHL} color="green" sub={`${Math.round(totalHL/totalJobs*100)}% du total`}/>
        <Kpi label="Driver Free moyen" value={avgFree} sub="chauffeurs / jour"/>
        <Kpi label="Rev moyen / Driver" value={`${fmt(avgRpd)} AED`} color="green" sub="Internal · par jour"/>
      </div>
      <div className="g4 fu d2" style={{marginTop:10}}>
        <Kpi label="Total missions" value={totalJobs}/>
        <Kpi label="LT total" value={byType.LT} color="orange"/>
        <Kpi label="LH total" value={byType.LH} color="orange"/>
        <Kpi label="% Internal" value={`${internalPct}%`} color="blue" sub={`${100-internalPct}% sous-traitance`}/>
      </div>

      {/* CA CHART */}
      <Sec>Évolution CA journalier</Sec>
      <Card className="fu d2">
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>Revenue AED · hors LT & LH · {m.label}</div>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:"#007aff"}}>Total: {fmtK(totalRev)} AED</div>
        </div>
        <BarChart data={m.amount} labels={labels} color="#007aff" height={130}/>
      </Card>

      {/* REV/DRIVER */}
      <Sec>Revenue moyen / Driver Free · Internal seulement</Sec>
      <Card className="fu d3">
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:13,fontWeight:600}}>AED / Driver Free / jour · Chabe Luxury uniquement</div>
          <div style={{fontSize:13,fontWeight:700,color:"#34c759"}}>Moy: {fmt(avgRpd)} AED</div>
        </div>
        <LineChart data={m.revDriver} labels={labels} color="#34c759" height={110}/>
      </Card>

      {/* BILLING ACCOUNTS — tous services inclus */}
      <Sec>Revenue par Billing Account · tous services (LT + LH inclus)</Sec>
      <Card className="fu d3">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:13,fontWeight:700}}>Top Billing Accounts</div>
            <div style={{fontSize:11,color:"#86868b"}}>CA total réalisé · {m.label}</div>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:"#007aff"}}>{fmtK(totalBA)} AED total</div>
        </div>
        {m.billingAccounts.map((b,i)=>(
          <div key={b.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<m.billingAccounts.length-1?"1px solid #f5f5f7":"none"}}>
            <div style={{width:26,height:26,borderRadius:7,flexShrink:0,background:i<3?"#1d1d1f":"#f5f5f7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:i<3?"#fff":"#86868b"}}>{i+1}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.name}</span>
                {b.hasLease&&<span style={{fontSize:9,fontWeight:700,background:"rgba(255,149,0,0.12)",color:"#ff9500",padding:"1px 6px",borderRadius:3,flexShrink:0}}>LEASE</span>}
              </div>
              <div style={{background:"#f5f5f7",height:4,borderRadius:2}}>
                <div style={{width:`${Math.round(b.rev/maxBA*100)}%`,height:"100%",borderRadius:2,background:b.hasLease?"#ff9500":i<3?"#1d1d1f":"#d1d1d6"}}/>
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0,minWidth:90}}>
              <div style={{fontSize:13,fontWeight:700}}>{fmt(b.rev)}</div>
              <div style={{fontSize:10,color:"#86868b"}}>{b.jobs} jobs · {Math.round(b.rev/totalBA*100)}%</div>
            </div>
          </div>
        ))}
      </Card>

      {/* SOUS-TRAITANCE MENSUELLE */}
      <Sec>Sous-traitance mensuelle</Sec>
      <Card className="fu d3">
        <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>Répartition Internal / External</div>
        <div style={{fontSize:11,color:"#86868b",marginBottom:16}}>Hors LT & LH · {m.label}</div>
        {m.providers.map((p,i)=>(
          <div key={p.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<m.providers.length-1?"1px solid #f5f5f7":"none"}}>
            <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:p.type==="Internal"?"rgba(0,122,255,0.1)":"rgba(255,149,0,0.1)",color:p.type==="Internal"?"#007aff":"#ff9500",flexShrink:0}}>
              {p.type==="Internal"?"INTERNE":"EXTERNE"}
            </span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
              <div style={{background:"#f5f5f7",height:4,borderRadius:2}}>
                <div style={{width:`${p.pct}%`,height:"100%",borderRadius:2,background:p.type==="Internal"?"#007aff":"#ff9500"}}/>
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:13,fontWeight:700}}>{fmtK(p.rev)} AED</div>
              <div style={{fontSize:10,color:"#86868b"}}>{p.jobs} jobs · {p.pct}%</div>
            </div>
          </div>
        ))}
      </Card>

      {/* ── FLOTTE VS BESOIN ── */}
      <Sec>Flotte vs Besoin mensuel</Sec>
      <Card className="fu d3">
        {/* Header KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
          <div style={{background:"#f5f5f7",borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:10,fontWeight:600,color:"#86868b",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>Véhicules nécessaires</div>
            <div style={{fontSize:26,fontWeight:800,letterSpacing:"-0.5px"}}>{besoinTotal}</div>
            <div style={{fontSize:10,color:"#86868b",marginTop:2}}>{totalHorsLease} missions ÷ ({nbDays}j × 2.5)</div>
          </div>
          <div style={{background:"rgba(0,122,255,0.06)",borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:10,fontWeight:600,color:"#86868b",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>Flotte office dispo</div>
            <div style={{fontSize:26,fontWeight:800,letterSpacing:"-0.5px",color:"#007aff"}}>{fleetOffice}</div>
            <div style={{fontSize:10,color:"#86868b",marginTop:2}}>véhicules en position office</div>
          </div>
          <div style={{background:surplus>=0?"rgba(52,199,89,0.08)":"rgba(255,59,48,0.08)",borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:10,fontWeight:600,color:"#86868b",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>{surplus>=0?"Surplus":"Manque"}</div>
            <div style={{fontSize:26,fontWeight:800,letterSpacing:"-0.5px",color:surplus>=0?"#34c759":"#ff3b30"}}>
              {surplus>=0?"+":""}{surplus}
            </div>
            <div style={{fontSize:10,color:"#86868b",marginTop:2}}>
              {prevBesoin!=null&&<span>vs {prevKey} : besoin était {prevBesoin} ({diff>0?"+":""}{diff})</span>}
            </div>
          </div>
        </div>

        {/* Barre progress globale */}
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:11,fontWeight:600}}>Taux d'utilisation flotte office</span>
            <span style={{fontSize:12,fontWeight:700,color:besoinTotal/fleetOffice>0.9?"#ff9500":besoinTotal/fleetOffice>1?"#ff3b30":"#34c759"}}>
              {Math.round(besoinTotal/fleetOffice*100)}%
            </span>
          </div>
          <div style={{background:"#f5f5f7",height:8,borderRadius:4,overflow:"hidden"}}>
            <div style={{
              width:`${Math.min(100,Math.round(besoinTotal/fleetOffice*100))}%`,
              height:"100%",borderRadius:4,
              background:besoinTotal/fleetOffice>1?"#ff3b30":besoinTotal/fleetOffice>0.9?"#ff9500":"#34c759"
            }}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
            <span style={{fontSize:9,color:"#86868b"}}>0 véhicules</span>
            <span style={{fontSize:9,color:"#86868b"}}>{fleetOffice} véhicules (max dispo)</span>
          </div>
        </div>

        {/* Tableau comparatif par catégorie mois vs mois */}
        <div style={{fontSize:11,fontWeight:700,marginBottom:10,color:"#86868b",textTransform:"uppercase",letterSpacing:"0.5px"}}>
          Détail par catégorie — {sel}{prevKey?` vs ${prevKey}`:""}
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
            <thead>
              <tr style={{background:"#f5f5f7"}}>
                {["Catégorie","Missions","Besoin",prevKey?`Missions ${prevKey}`:"—",prevKey?`Évol.`:"","Flotte dispo","Statut"].map(h=>(
                  <th key={h} style={{padding:"9px 14px",fontSize:10,fontWeight:700,color:"#86868b",textAlign:"left",textTransform:"uppercase",letterSpacing:"0.5px",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fleetRows.map((r,i)=>{
                const prevMiss = r.prevMissions;
                const evolMiss = prevMiss!=null && prevMiss>0 ? Math.round((r.missions-prevMiss)/prevMiss*100) : null;
                const ok = r.dispo >= r.besoin;
                return(
                  <tr key={r.cat} style={{borderTop:"1px solid #f5f5f7"}}>
                    <td style={{padding:"11px 14px",fontSize:12,fontWeight:600}}>{r.cat}</td>
                    <td style={{padding:"11px 14px",fontSize:13,fontWeight:700}}>{r.missions}</td>
                    <td style={{padding:"11px 14px"}}>
                      <span style={{fontSize:12,fontWeight:700,color:"#1d1d1f"}}>{r.besoin}</span>
                      <span style={{fontSize:10,color:"#86868b"}}> veh.</span>
                    </td>
                    <td style={{padding:"11px 14px",fontSize:12,color:"#86868b"}}>{prevMiss!=null?prevMiss:"—"}</td>
                    <td style={{padding:"11px 14px"}}>
                      {evolMiss!=null?(
                        <span style={{fontSize:11,fontWeight:700,color:evolMiss>0?"#ff9500":evolMiss<0?"#34c759":"#86868b"}}>
                          {evolMiss>0?"+":""}{evolMiss}%
                        </span>
                      ):"—"}
                    </td>
                    <td style={{padding:"11px 14px",fontSize:13,fontWeight:700,color:"#007aff"}}>{r.dispo}</td>
                    <td style={{padding:"11px 14px"}}>
                      <span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:5,
                        background:ok?"rgba(52,199,89,0.1)":"rgba(255,59,48,0.1)",
                        color:ok?"#34c759":"#ff3b30"}}>
                        {ok?`+${r.dispo-r.besoin} surplus`:`${r.besoin-r.dispo} manque`}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {/* Total row */}
              <tr style={{borderTop:"2px solid #1d1d1f",background:"#f9f9f9"}}>
                <td style={{padding:"12px 14px",fontSize:12,fontWeight:800}}>TOTAL</td>
                <td style={{padding:"12px 14px",fontSize:14,fontWeight:800}}>{totalHorsLease}</td>
                <td style={{padding:"12px 14px",fontSize:14,fontWeight:800}}>{besoinTotal}</td>
                <td style={{padding:"12px 14px",fontSize:12,fontWeight:700,color:"#86868b"}}>{prevHL!=null?prevHL:"—"}</td>
                <td style={{padding:"12px 14px"}}>
                  {prevHL!=null&&<span style={{fontSize:11,fontWeight:700,color:totalHorsLease>prevHL?"#ff9500":"#34c759"}}>
                    {totalHorsLease>prevHL?"+":""}{Math.round((totalHorsLease-prevHL)/prevHL*100)}%
                  </span>}
                </td>
                <td style={{padding:"12px 14px",fontSize:14,fontWeight:800,color:"#007aff"}}>{fleetOffice}</td>
                <td style={{padding:"12px 14px"}}>
                  <span style={{fontSize:11,fontWeight:800,padding:"4px 10px",borderRadius:6,
                    background:surplus>=0?"rgba(52,199,89,0.12)":"rgba(255,59,48,0.12)",
                    color:surplus>=0?"#34c759":"#ff3b30"}}>
                    {surplus>=0?`+${surplus} surplus`:`${Math.abs(surplus)} manque`}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{marginTop:14,fontSize:10,color:"#86868b",fontStyle:"italic"}}>
          Besoin = missions hors LT & LH ÷ ({nbDays} jours × 2.5 missions/véhicule/jour)
        </div>
      </Card>

      {/* SERVICE TYPES */}
      <Sec>Total par type de service</Sec>
      <div className="g7 fu d4">
        {Object.entries(byType).map(([k,v])=>(
          <JobPill key={k} label={k} count={v} color={["LT","LH"].includes(k)?"#ff9500":["ST","SH"].includes(k)?"#007aff":"#34c759"}/>
        ))}
      </div>

      {/* DRIVER FREE */}
      <Sec>Driver Free par jour</Sec>
      <Card className="fu d4">
        <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Nombre de Driver Free</div>
        <div style={{fontSize:11,color:"#86868b",marginBottom:12}}>Moy: {avgFree} drivers free / jour</div>
        <BarChart data={m.free} labels={labels} color="#af52de" height={90}/>
      </Card>
    </div>
  );
}

// ── ANNUAL FLEET BLOCK ───────────────────────────────────────────────────────
function AnnualFleetBlock({a}){
  // Build month-by-month fleet vs besoin from MONTHLY_DATA + ANNUAL
  const fleetOffice = FLEET.filter(v=>v.location==="Office").length;

  // Cat filter helpers (same as MonthlyView)
  const isSClass = v => {const m=(v.model||"").toLowerCase();return m.includes("s-class")||m.includes("maybach")||m.includes("a6");};
  const isVClass = v => {const m=(v.model||"").toLowerCase();return m.includes("v-class")||m.includes("vito")||m.includes("falcon");};
  const isElec   = v => v.fuel==="Electric" && (v.model||"").toLowerCase().includes("eqs")||v.fuel==="Electric"&&(v.model||"").toLowerCase().includes("i7");
  const isSUV    = v => {const m=(v.model||"").toLowerCase();return m.includes("suburban")||m.includes("escalade");};

  const offSClass = FLEET.filter(v=>v.location==="Office"&&isSClass(v)).length;
  const offVClass = FLEET.filter(v=>v.location==="Office"&&isVClass(v)).length;
  const offElec   = FLEET.filter(v=>v.location==="Office"&&v.fuel==="Electric").length;
  const offSUV    = FLEET.filter(v=>v.location==="Office"&&isSUV(v)).length;

  // Months with data — combine MONTHLY_DATA keys + fill blanks from ANNUAL arrays
  // We'll use MONTHLY_DATA when available, else estimate from ANNUAL jobs
  const MONTHLY_KEYS_ALL = Object.keys(MONTHLY_DATA); // ["Fév 2026","Jan 2026"]

  const monthRows = a.months.map((lbl, i) => {
    // Try to find matching monthly data
    const mKey = MONTHLY_KEYS_ALL.find(k => {
      const y = k.includes("2026")?"2026":"2025";
      const mIdx = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"].indexOf(lbl);
      return k.includes(y) && (
        (y==="2026" && a.amount2026[i]!=null) ||
        (y==="2025" && a.amount2025[i]!=null)
      ) && k.toLowerCase().startsWith(["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"][mIdx]?.slice(0,3).toLowerCase()||"");
    });

    // Use actual monthly data if available
    const md2026 = MONTHLY_KEYS_ALL.find(k=>k.includes("2026")&&k.toLowerCase().includes(
      ["jan","fév","mar","avr","mai","jui","juil","aoû","sep","oct","nov","déc"][i]?.toLowerCase()||""
    ));
    const md2025 = MONTHLY_KEYS_ALL.find(k=>k.includes("2025")&&k.toLowerCase().includes(
      ["jan","fév","mar","avr","mai","jui","juil","aoû","sep","oct","nov","déc"][i]?.toLowerCase()||""
    ));

    let missions2026 = null, besoin2026 = null;
    let missions2025 = null, besoin2025 = null;

    if(md2026 && MONTHLY_DATA[md2026]) {
      const m = MONTHLY_DATA[md2026];
      const nb = m.days.length;
      const miss = (m.ST||[]).reduce((s,v)=>s+v,0)+(m.SH||[]).reduce((s,v)=>s+v,0)+(m.T||[]).reduce((s,v)=>s+v,0)+(m.H||[]).reduce((s,v)=>s+v,0);
      missions2026 = miss;
      besoin2026 = Math.ceil(miss/(nb*2.5));
    } else if(a.amount2026[i]!=null) {
      // Estimate from jobs (hors LT/LH ~ 60% of total)
      const j = a.jobs2026[i];
      if(j) { missions2026 = Math.round(j*0.6); besoin2026 = Math.ceil(missions2026/(28*2.5)); }
    }

    if(md2025 && MONTHLY_DATA[md2025]) {
      const m = MONTHLY_DATA[md2025];
      const nb = m.days.length;
      const miss = (m.ST||[]).reduce((s,v)=>s+v,0)+(m.SH||[]).reduce((s,v)=>s+v,0)+(m.T||[]).reduce((s,v)=>s+v,0)+(m.H||[]).reduce((s,v)=>s+v,0);
      missions2025 = miss;
      besoin2025 = Math.ceil(miss/(nb*2.5));
    } else if(a.amount2025[i]!=null) {
      const j = a.jobs2025[i];
      if(j) { missions2025 = Math.round(j*0.6); besoin2025 = Math.ceil(missions2025/(28*2.5)); }
    }

    const has2026 = missions2026!=null;
    const surplus2026 = has2026 ? fleetOffice - besoin2026 : null;

    return { lbl, i, missions2026, besoin2026, surplus2026, missions2025, besoin2025, has2026 };
  });

  const cats = [
    {label:"S Class / Sedan", dispo: offSClass},
    {label:"V Class / Vito",  dispo: offVClass},
    {label:"EQS / i7 Élec.",  dispo: offElec},
    {label:"SUV",             dispo: offSUV},
  ];

  // For each month with 2026 data, compute per-cat missions from MONTHLY_DATA
  const getMonthCats = (monthLabel) => {
    const mk = Object.keys(MONTHLY_DATA).find(k=>{
      const ml = monthLabel.toLowerCase();
      return k.includes("2026") && (
        (ml==="jan" && k.toLowerCase().includes("jan")) ||
        (ml==="fév" && k.toLowerCase().includes("fév")) ||
        (ml==="fév" && k.toLowerCase().includes("fev"))
      );
    });
    if(!mk) return null;
    const m = MONTHLY_DATA[mk];
    const nb = m.days.length;
    const mST = (m.ST||[]).reduce((s,v)=>s+v,0)+(m.SH||[]).reduce((s,v)=>s+v,0);
    const mT  = (m.T||[]).reduce((s,v)=>s+v,0);
    const mH  = (m.H||[]).reduce((s,v)=>s+v,0);
    return [
      {missions:mST, besoin:Math.ceil(mST/(nb*2.5)), dispo:offSClass},
      {missions:mT,  besoin:Math.ceil(mT/(nb*2.5)),  dispo:offVClass},
      {missions:mH,  besoin:Math.ceil(mH/(nb*2.5)),  dispo:offElec},
      {missions:0,   besoin:0,                        dispo:offSUV},
    ];
  };

  // Only show months with actual data
  const activeMonths = monthRows.filter(r=>r.has2026);

  return(
    <Card className="fu d3">
      {/* Header KPIs — YTD totals */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
        <div style={{background:"#f5f5f7",borderRadius:12,padding:"14px 16px"}}>
          <div style={{fontSize:10,fontWeight:600,color:"#86868b",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>Flotte office dispo</div>
          <div style={{fontSize:26,fontWeight:800,letterSpacing:"-0.5px",color:"#007aff"}}>{fleetOffice}</div>
          <div style={{fontSize:10,color:"#86868b",marginTop:2}}>véhicules en position office</div>
        </div>
        <div style={{background:"#f5f5f7",borderRadius:12,padding:"14px 16px"}}>
          <div style={{fontSize:10,fontWeight:600,color:"#86868b",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>Mois analysés</div>
          <div style={{fontSize:26,fontWeight:800,letterSpacing:"-0.5px"}}>{activeMonths.length}</div>
          <div style={{fontSize:10,color:"#86868b",marginTop:2}}>données réelles disponibles</div>
        </div>
        <div style={{background:"#f5f5f7",borderRadius:12,padding:"14px 16px"}}>
          <div style={{fontSize:10,fontWeight:600,color:"#86868b",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>Besoin max. observé</div>
          <div style={{fontSize:26,fontWeight:800,letterSpacing:"-0.5px",color:"#ff9500"}}>
            {activeMonths.length>0?Math.max(...activeMonths.map(r=>r.besoin2026||0)):"—"}
          </div>
          <div style={{fontSize:10,color:"#86868b",marginTop:2}}>véhicules nécessaires (pic)</div>
        </div>
      </div>

      {/* Table mois par mois */}
      <div style={{fontSize:11,fontWeight:700,marginBottom:10,color:"#86868b",textTransform:"uppercase",letterSpacing:"0.5px"}}>
        Besoin mensuel 2026 — mois par mois
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
          <thead>
            <tr style={{background:"#f5f5f7"}}>
              {["Mois","Missions HorsLease","Besoin","Flotte dispo","Surplus / Manque","Taux utilisation"].map(h=>(
                <th key={h} style={{padding:"9px 14px",fontSize:10,fontWeight:700,color:"#86868b",textAlign:"left",textTransform:"uppercase",letterSpacing:"0.5px",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthRows.map((r)=>{
              if(!r.has2026) return(
                <tr key={r.lbl} style={{borderTop:"1px solid #f5f5f7",opacity:0.35}}>
                  <td style={{padding:"10px 14px",fontSize:12,fontWeight:700,color:"#86868b"}}>{r.lbl}</td>
                  <td colSpan={5} style={{padding:"10px 14px",fontSize:11,color:"#d1d1d6",fontStyle:"italic"}}>Données non disponibles</td>
                </tr>
              );
              const surplus = r.surplus2026;
              const ok = surplus >= 0;
              const taux = r.besoin2026 ? Math.round(r.besoin2026/fleetOffice*100) : 0;
              const tauxColor = taux>100?"#ff3b30":taux>85?"#ff9500":"#34c759";
              return(
                <tr key={r.lbl} style={{borderTop:"1px solid #f5f5f7"}}>
                  <td style={{padding:"11px 14px",fontSize:13,fontWeight:800}}>{r.lbl}</td>
                  <td style={{padding:"11px 14px",fontSize:13,fontWeight:700}}>{r.missions2026!=null?r.missions2026.toLocaleString("fr-FR"):"—"}</td>
                  <td style={{padding:"11px 14px"}}>
                    <span style={{fontSize:13,fontWeight:700}}>{r.besoin2026}</span>
                    <span style={{fontSize:10,color:"#86868b"}}> veh.</span>
                  </td>
                  <td style={{padding:"11px 14px",fontSize:13,fontWeight:700,color:"#007aff"}}>{fleetOffice}</td>
                  <td style={{padding:"11px 14px"}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:6,
                      background:ok?"rgba(52,199,89,0.1)":"rgba(255,59,48,0.1)",
                      color:ok?"#34c759":"#ff3b30"}}>
                      {ok?`+${surplus} surplus`:`${Math.abs(surplus)} manque`}
                    </span>
                  </td>
                  <td style={{padding:"11px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,background:"#f5f5f7",height:6,borderRadius:3,overflow:"hidden",minWidth:60}}>
                        <div style={{width:`${Math.min(100,taux)}%`,height:"100%",background:tauxColor,borderRadius:3}}/>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,color:tauxColor,minWidth:34}}>{taux}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Détail par catégorie — pour les mois avec données réelles */}
      {activeMonths.length>0&&(
        <>
          <div style={{fontSize:11,fontWeight:700,marginTop:24,marginBottom:10,color:"#86868b",textTransform:"uppercase",letterSpacing:"0.5px"}}>
            Détail par catégorie — mois avec données réelles
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
              <thead>
                <tr style={{background:"#f5f5f7"}}>
                  <th style={{padding:"9px 14px",fontSize:10,fontWeight:700,color:"#86868b",textAlign:"left",textTransform:"uppercase",letterSpacing:"0.5px"}}>Catégorie</th>
                  <th style={{padding:"9px 14px",fontSize:10,fontWeight:700,color:"#86868b",textAlign:"left",textTransform:"uppercase",letterSpacing:"0.5px"}}>Flotte dispo</th>
                  {activeMonths.map(r=>(
                    <th key={r.lbl} style={{padding:"9px 14px",fontSize:10,fontWeight:700,color:"#86868b",textAlign:"left",textTransform:"uppercase",letterSpacing:"0.5px",whiteSpace:"nowrap"}}>{r.lbl}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cats.map(cat=>(
                  <tr key={cat.label} style={{borderTop:"1px solid #f5f5f7"}}>
                    <td style={{padding:"11px 14px",fontSize:12,fontWeight:600}}>{cat.label}</td>
                    <td style={{padding:"11px 14px",fontSize:13,fontWeight:700,color:"#007aff"}}>{cat.dispo}</td>
                    {activeMonths.map(r=>{
                      const catData = getMonthCats(r.lbl);
                      const catIdx = cats.indexOf(cat);
                      const cd = catData ? catData[catIdx] : null;
                      if(!cd) return <td key={r.lbl} style={{padding:"11px 14px",color:"#86868b"}}>—</td>;
                      const ok = cd.dispo >= cd.besoin;
                      return(
                        <td key={r.lbl} style={{padding:"11px 14px"}}>
                          <div style={{fontSize:12,fontWeight:700}}>{cd.missions} miss.</div>
                          <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,
                            background:ok?"rgba(52,199,89,0.1)":"rgba(255,59,48,0.1)",
                            color:ok?"#34c759":"#ff3b30",display:"inline-block",marginTop:3}}>
                            {ok?`+${cd.dispo-cd.besoin} surplus`:`${cd.besoin-cd.dispo} manque`}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div style={{marginTop:14,fontSize:10,color:"#86868b",fontStyle:"italic"}}>
        Besoin = missions hors LT & LH ÷ (jours du mois × 2.5 missions/véhicule/jour)
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ANNUAL VIEW
// ═══════════════════════════════════════════════════════════════════════════
function AnnualView(){
  const a=ANNUAL;
  const [selMonth,setSelMonth]=useState(1);
  const months2026=a.amount2026.filter(v=>v!=null).length;
  const tot25=sum(a.amount2025.slice(0,months2026));
  const tot26=sum(a.amount2026.slice(0,months2026));
  const evolRev=pct(tot26,tot25);
  const avgRpd25=avg(a.revPerDriver2025);
  const avgRpd26=avg(a.revPerDriver2026.filter(v=>v!=null));
  const evolRpd=pct(avgRpd26,avgRpd25);
  const r25=a.amount2025[selMonth],r26=a.amount2026[selMonth];
  const rpd25=a.revPerDriver2025[selMonth],rpd26=a.revPerDriver2026[selMonth];
  const j25=a.jobs2025[selMonth],j26=a.jobs2026[selMonth];
  return(
    <div>
      <Sec mt={0}>2025 vs 2026 — YTD ({months2026} mois)</Sec>
      <div className="g4 fu d1">
        <Kpi label="CA 2025 YTD" value={`${fmtK(tot25)} AED`}/>
        <Kpi label="CA 2026 YTD" value={`${fmtK(tot26)} AED`} color="blue"/>
        <Kpi label="Évolution CA" value={`${evolRev>0?"+":""}${evolRev}%`} color={evolRev>0?"green":"red"}/>
        <Kpi label="Évol Rev/Driver" value={`${evolRpd>0?"+":""}${evolRpd}%`} color={evolRpd>0?"green":"red"} sub={`${fmt(avgRpd25)} → ${fmt(avgRpd26)} AED`}/>
      </div>
      <Sec>CA mensuel — Cliquer pour comparer</Sec>
      <Card className="fu d2">
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
          {a.months.map((m,i)=>(
            <button key={m} onClick={()=>setSelMonth(i)} style={{background:selMonth===i?"#1d1d1f":"#f5f5f7",color:selMonth===i?"#fff":"#86868b",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:selMonth===i?700:500,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",opacity:a.amount2026[i]==null?0.4:1}}>{m}</button>
          ))}
        </div>
        <DualBar data2025={a.amount2025} data2026={a.amount2026} labels={a.months} height={140} selectedIdx={selMonth}/>
      </Card>
      <Sec>Détail — {a.months[selMonth]}</Sec>
      <div className="g4 fu d3">
        <Kpi label={`CA ${a.months[selMonth]} 2025`} value={r25?`${fmt(r25)} AED`:"—"}/>
        <Kpi label={`CA ${a.months[selMonth]} 2026`} value={r26?`${fmt(r26)} AED`:"—"} color={r26?"blue":"default"}/>
        <Kpi label="Évolution CA" value={r25&&r26?`${pct(r26,r25)>0?"+":""}${pct(r26,r25)}%`:"—"} color={r25&&r26?(pct(r26,r25)>0?"green":"red"):"default"}/>
        <Kpi label="Jobs / jour" value={j26!=null?`${j25} → ${j26}`:(j25?fmt(j25):"—")} sub={j26!=null?`+${pct(j26,j25)}%`:undefined}/>
      </div>
      <div className="g4 fu d3" style={{marginTop:10}}>
        <Kpi label="Rev/Driver 2025" value={rpd25?`${fmt(rpd25)} AED`:"—"}/>
        <Kpi label="Rev/Driver 2026" value={rpd26?`${fmt(rpd26)} AED`:"—"} color={rpd26?"blue":"default"}/>
        <Kpi label="Évol Rev/Driver" value={rpd25&&rpd26?`${pct(rpd26,rpd25)>0?"+":""}${pct(rpd26,rpd25)}%`:"—"} color={rpd25&&rpd26?(pct(rpd26,rpd25)>0?"green":"red"):"default"}/>
        <Kpi label="Mois disponibles" value={`${months2026} / 12`} sub="2026 en cours"/>
      </div>
      <Sec>Flotte vs Besoin — mois par mois</Sec>
      <AnnualFleetBlock a={a}/>

      <Sec>Tableau complet</Sec>
      <Card className="fu d4" style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
            <thead>
              <tr style={{background:"#f5f5f7"}}>
                {["Mois","CA 2025","CA 2026","Évol CA","Rev/Driver 2025","Rev/Driver 2026","Évol R/D"].map(h=>(
                  <th key={h} style={{padding:"10px 16px",fontSize:10,fontWeight:700,color:"#86868b",textAlign:"left",letterSpacing:"0.5px",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {a.months.map((m,i)=>{
                const r25=a.amount2025[i],r26=a.amount2026[i];
                const rpd25=a.revPerDriver2025[i],rpd26=a.revPerDriver2026[i];
                const eCA=r25&&r26?pct(r26,r25):null;
                const eRpd=rpd25&&rpd26?pct(rpd26,rpd25):null;
                const isSel=selMonth===i;
                return(
                  <tr key={m} onClick={()=>setSelMonth(i)} style={{borderTop:"1px solid #f5f5f7",cursor:"pointer",background:isSel?"rgba(0,122,255,0.04)":"transparent"}}>
                    <td style={{padding:"10px 16px",fontWeight:700,color:isSel?"#007aff":"#1d1d1f"}}>{m}</td>
                    <td style={{padding:"10px 16px",color:"#86868b",fontFamily:"monospace",fontSize:12}}>{r25?fmt(r25):"—"}</td>
                    <td style={{padding:"10px 16px",color:r26?"#007aff":"#86868b",fontWeight:r26?600:400,fontFamily:"monospace",fontSize:12}}>{r26?fmt(r26):"—"}</td>
                    <td style={{padding:"10px 16px",color:eCA>0?"#34c759":eCA<0?"#ff3b30":"#86868b",fontWeight:600}}>{eCA!=null?`${eCA>0?"+":""}${eCA}%`:"—"}</td>
                    <td style={{padding:"10px 16px",color:"#86868b",fontFamily:"monospace",fontSize:12}}>{rpd25?fmt(rpd25):"—"}</td>
                    <td style={{padding:"10px 16px",color:rpd26?"#007aff":"#86868b",fontWeight:rpd26?600:400,fontFamily:"monospace",fontSize:12}}>{rpd26?fmt(rpd26):"—"}</td>
                    <td style={{padding:"10px 16px",color:eRpd>0?"#34c759":eRpd<0?"#ff3b30":"#86868b",fontWeight:600}}>{eRpd!=null?`${eRpd>0?"+":""}${eRpd}%`:"—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FLEET VIEW
// ═══════════════════════════════════════════════════════════════════════════
// ─── VEHICLE MODAL ────────────────────────────────────────────────────────────
function VehicleModal({vehicle:v, onClose}){
  const [tab,setTab]=useState("info");
  const [editMode,setEditMode]=useState(false);
  const [photos,setPhotos]=useState([]); // [{name, base64, preview}]
  const [pdfLoading,setPdfLoading]=useState(false);
  const [pdfHtml,setPdfHtml]=useState(null);

  const svcSince = v.km && v.lastServiceKm ? v.km - v.lastServiceKm : null;
  const svcRemain = svcSince!=null ? v.serviceInterval - svcSince : null;
  const svcPct = svcSince!=null ? Math.min(100, Math.round(svcSince/v.serviceInterval*100)) : 0;
  const svcColor = svcPct>=100?"#ff3b30":svcPct>=80?"#ff9500":"#34c759";

  const Field = ({label,value,full=false,mono=false}) => (
    <div style={{gridColumn:full?"1/-1":"auto"}}>
      <div style={{fontSize:10,fontWeight:600,color:"#86868b",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</div>
      <div style={{fontSize:13,fontWeight:600,color:value?"#1d1d1f":"#d1d1d6",fontFamily:mono?"monospace":"inherit"}}>{value||"—"}</div>
    </div>
  );

  const colorDot = (col) => {
    const map={Black:"#1d1d1f",White:"#f5f5f5",Blue:"#007aff",Beige:"#c8b89a",Brown:"#8b5e3c",Red:"#ff3b30",Grey:"#86868b"};
    return map[col]||"#d1d1d6";
  };

  // Handle photo uploads
  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files).slice(0, 6);
    const loaded = await Promise.all(files.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = () => res({name:f.name, base64:r.result.split(",")[1], preview:r.result, type:f.type});
      r.readAsDataURL(f);
    })));
    setPhotos(prev => [...prev, ...loaded].slice(0,6));
  };

  // Generate brochure via Claude API
  const generatePdf = async () => {
    setPdfLoading(true);
    setPdfHtml(null);
    try {
      const photoContent = photos.map(p => ({
        type:"image",
        source:{type:"base64", media_type:p.type||"image/jpeg", data:p.base64}
      }));

      const vehicleInfo = `
Immatriculation: ${v.plate}
Marque: ${v.make}
Modèle: ${v.model}
Année: ${v.year}
Carburant: ${v.fuel}
Couleur extérieure: ${v.extColor}
Couleur intérieure: ${v.intColor}
VIN: ${v.vin||"—"}
Kilométrage: ${v.km ? v.km.toLocaleString("fr-FR")+" km" : "—"}
Position: ${v.location==="Lease"?`Lease · ${v.hotel}`:"Office"}
Prix d'achat: ${v.purchaseAmount ? v.purchaseAmount.toLocaleString("fr-FR")+" AED" : "—"}
Moteur: ${v.engineSize!=="Electric"?v.engineSize+" cc":"Électrique"}
CO2: ${v.co2||"—"}
Assurance: ${v.insurance||"—"}
      `.trim();

      const prompt = photos.length > 0
        ? `Tu es un expert en présentation de véhicules de luxe. Voici ${photos.length} photo(s) du véhicule et ses informations.\n\n${vehicleInfo}\n\nGénère une brochure HTML complète, élégante et professionnelle pour ce véhicule de la flotte CHABE Dubai. La brochure doit être belle, avec un design haut de gamme noir et or, prête à être imprimée ou partagée avec un client. Inclus toutes les infos du véhicule. Retourne UNIQUEMENT le code HTML complet (avec <html>, <head>, <body> et les styles CSS inline).`
        : `Tu es un expert en présentation de véhicules de luxe. Voici les informations du véhicule:\n\n${vehicleInfo}\n\nGénère une brochure HTML complète, élégante et professionnelle pour ce véhicule de la flotte CHABE Dubai. Design haut de gamme noir et or, prête à imprimer. Retourne UNIQUEMENT le code HTML complet.`;

      const messages = [{
        role:"user",
        content: photos.length > 0
          ? [...photoContent, {type:"text", text:prompt}]
          : prompt
      }];

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:4000,
          messages
        })
      });
      const data = await res.json();
      const html = data.content?.map(b=>b.text||"").join("") || "";
      // Extract HTML if wrapped in markdown
      const match = html.match(/```html\n?([\s\S]*?)```/) || html.match(/<html[\s\S]*<\/html>/i);
      setPdfHtml(match ? (match[1]||match[0]) : html);
    } catch(err) {
      alert("Erreur génération: "+err.message);
    }
    setPdfLoading(false);
  };

  const printPdf = () => {
    const w = window.open("","_blank");
    w.document.write(pdfHtml);
    w.document.close();
    w.focus();
    setTimeout(()=>w.print(), 800);
  };

  // Mock service history
  const svcHistory = [
    {date:"2024-11-15",km:v.lastServiceKm||0,type:"Révision complète",cost:2400,garage:"Mercedes Service Center Dubai"},
    {date:"2024-04-08",km:(v.lastServiceKm||0)-v.serviceInterval,type:"Vidange + filtres",cost:1200,garage:"Mercedes Service Center Dubai"},
    {date:"2023-09-22",km:(v.lastServiceKm||0)-v.serviceInterval*2,type:"Révision + freins",cost:3800,garage:"BMW Service Abu Dhabi"},
  ].filter(s=>s.km>0);

  // Mock expenses
  const expenses = [
    {date:"2025-01-15",type:"Assurance",amount:v.insurancePayment||0,ref:"INS-2025-001"},
    {date:"2024-12-03",type:"Carburant",amount:380,ref:"FUEL-1203"},
    {date:"2024-11-15",type:"Révision",amount:2400,ref:"SVC-1115"},
    {date:"2024-10-28",type:"Carburant",amount:420,ref:"FUEL-1028"},
    {date:"2024-09-14",type:"Pneus",amount:3200,ref:"TYR-0914"},
  ];
  const totalExpenses = sum(expenses.map(e=>e.amount));

  const tabs=[
    {id:"info",label:"Informations"},
    {id:"service",label:"Maintenance"},
    {id:"finance",label:"Finance"},
    {id:"expenses",label:"Dépenses"},
    {id:"docs",label:"Documents"},
  ];

  return(
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(4px)"}}/>
      <div onClick={e=>e.stopPropagation()} style={{
        position:"relative",background:"#fff",borderRadius:24,width:"100%",maxWidth:760,
        maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",
        boxShadow:"0 24px 80px rgba(0,0,0,0.3)"
      }}>
        {/* HEADER */}
        <div style={{padding:"24px 28px 0",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:"#86868b",marginBottom:4,letterSpacing:"0.5px",textTransform:"uppercase"}}>{v.make}</div>
              <div style={{fontSize:22,fontWeight:800,letterSpacing:"-0.5px"}}>{v.model}</div>
              <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontFamily:"monospace",fontSize:13,fontWeight:700,background:"#1d1d1f",color:"#fff",padding:"3px 10px",borderRadius:6}}>{v.plate}</span>
                <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:6,background:v.location==="Office"?"rgba(0,122,255,0.1)":"rgba(255,149,0,0.1)",color:v.location==="Office"?"#007aff":"#ff9500"}}>
                  {v.location==="Office"?"Office":`Lease · ${v.hotel||""}`}
                </span>
                <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:6,background:v.fuel==="Electric"?"rgba(52,199,89,0.1)":"rgba(134,134,139,0.1)",color:v.fuel==="Electric"?"#34c759":"#86868b"}}>
                  {v.fuel==="Electric"?"⚡ Électrique":"⛽ Thermic"}
                </span>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
              <button onClick={()=>setEditMode(!editMode)} style={{background:editMode?"#007aff":"#f5f5f7",color:editMode?"#fff":"#1d1d1f",border:"none",borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                {editMode?"✓ Enregistrer":"✏️ Modifier"}
              </button>
              <button onClick={onClose} style={{background:"#f5f5f7",border:"none",borderRadius:10,padding:"8px 12px",fontSize:14,cursor:"pointer"}}>✕</button>
            </div>
          </div>

          {/* TAB BAR */}
          <div style={{display:"flex",gap:0,borderBottom:"1px solid #f5f5f7",overflowX:"auto"}}>
            {tabs.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                background:"none",border:"none",borderBottom:tab===t.id?"2px solid #1d1d1f":"2px solid transparent",
                padding:"10px 16px",fontSize:12,fontWeight:tab===t.id?700:500,
                color:tab===t.id?"#1d1d1f":"#86868b",cursor:"pointer",fontFamily:"inherit",
                whiteSpace:"nowrap",marginBottom:-1,
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div style={{overflowY:"auto",padding:"24px 28px",flex:1}}>

          {/* ── INFORMATIONS ── */}
          {tab==="info"&&(
            <div>
              <div style={{display:"flex",gap:16,marginBottom:24}}>
                {[{label:"Ext. Color",col:v.extColor},{label:"Int. Color",col:v.intColor}].map(c=>(
                  <div key={c.label} style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:colorDot(c.col),border:"2px solid rgba(0,0,0,0.1)",flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:9,fontWeight:600,color:"#86868b",textTransform:"uppercase",letterSpacing:"0.5px"}}>{c.label}</div>
                      <div style={{fontSize:12,fontWeight:600}}>{c.col||"—"}</div>
                    </div>
                  </div>
                ))}
                {v.km!=null&&(
                  <div style={{marginLeft:"auto",textAlign:"right"}}>
                    <div style={{fontSize:9,fontWeight:600,color:"#86868b",textTransform:"uppercase",letterSpacing:"0.5px"}}>Kilométrage actuel</div>
                    <div style={{fontSize:18,fontWeight:800,letterSpacing:"-0.5px"}}>{v.km.toLocaleString("fr-FR")} <span style={{fontSize:11,fontWeight:500,color:"#86868b"}}>km</span></div>
                    {v.avgKmMonth&&<div style={{fontSize:10,color:"#86868b"}}>Moy. {v.avgKmMonth.toLocaleString("fr-FR")} km/mois</div>}
                  </div>
                )}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px 32px"}}>
                <Field label="Immatriculation" value={v.plate} mono/>
                <Field label="Année" value={v.year}/>
                <Field label="Marque" value={v.make}/>
                <Field label="Modèle" value={v.model}/>
                <Field label="Carburant" value={v.fuel}/>
                <Field label="Motorisation" value={v.engineSize&&v.engineSize!=="Electric"?`${v.engineSize} cc`:"Électrique"}/>
                <Field label="CO₂" value={v.co2}/>
                <Field label="Statut" value={v.status||"Operating"}/>
                <Field label="VIN / Châssis" value={v.vin} full mono/>
                <Field label="Date mise en service" value={v.operationDate}/>
                <Field label="Date d'achat" value={v.purchaseDate}/>
                {v.location!=="Office"&&<>
                  <Field label="Client lease" value={v.hotel}/>
                  <Field label="Montant lease/mois" value={v.leaseAmount?`${v.leaseAmount.toLocaleString("fr-FR")} AED`:"—"}/>
                  <Field label="Statut lease" value={v.leaseStatus}/>
                  <Field label="Fin de lease" value={v.leaseEnd||"En cours"}/>
                </>}
              </div>
            </div>
          )}

          {/* ── MAINTENANCE ── */}
          {tab==="service"&&(
            <div>
              <div style={{background:"#f5f5f7",borderRadius:16,padding:"20px",marginBottom:24}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>Prochain service</div>
                    <div style={{fontSize:11,color:"#86868b"}}>Intervalle : {v.serviceInterval.toLocaleString("fr-FR")} km</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:20,fontWeight:800,color:svcColor}}>
                      {svcRemain!=null?(svcRemain>0?`${svcRemain.toLocaleString("fr-FR")} km`:"Dépassé"):"—"}
                    </div>
                    <div style={{fontSize:10,color:"#86868b"}}>{svcSince!=null?`${svcSince.toLocaleString("fr-FR")} km depuis dernier service`:"Aucun service enregistré"}</div>
                  </div>
                </div>
                <div style={{background:"#e5e5ea",height:8,borderRadius:4,overflow:"hidden"}}>
                  <div style={{width:`${svcPct}%`,height:"100%",background:svcColor,borderRadius:4}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                  <span style={{fontSize:10,color:"#86868b"}}>Dernier : {(v.lastServiceKm||0).toLocaleString("fr-FR")} km</span>
                  <span style={{fontSize:10,fontWeight:600,color:svcColor}}>{svcPct}%</span>
                  <span style={{fontSize:10,color:"#86868b"}}>Prochain : {((v.lastServiceKm||0)+v.serviceInterval).toLocaleString("fr-FR")} km</span>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:24}}>
                <div style={{background:"#f5f5f7",borderRadius:12,padding:"14px"}}>
                  <div style={{fontSize:10,fontWeight:600,color:"#86868b",marginBottom:4}}>Km actuels</div>
                  <div style={{fontSize:18,fontWeight:800}}>{v.km?v.km.toLocaleString("fr-FR"):"—"}</div>
                </div>
                <div style={{background:"#f5f5f7",borderRadius:12,padding:"14px"}}>
                  <div style={{fontSize:10,fontWeight:600,color:"#86868b",marginBottom:4}}>Dernier service</div>
                  <div style={{fontSize:18,fontWeight:800}}>{(v.lastServiceKm||0).toLocaleString("fr-FR")}</div>
                </div>
                <div style={{background:"#f5f5f7",borderRadius:12,padding:"14px"}}>
                  <div style={{fontSize:10,fontWeight:600,color:"#86868b",marginBottom:4}}>Fréquence</div>
                  <div style={{fontSize:18,fontWeight:800}}>{v.serviceInterval.toLocaleString("fr-FR")}</div>
                </div>
              </div>
              <div style={{fontSize:12,fontWeight:700,marginBottom:12}}>Historique des services</div>
              {svcHistory.length>0?svcHistory.map((s,i)=>(
                <div key={i} style={{display:"flex",gap:14,padding:"12px 0",borderBottom:"1px solid #f5f5f7",alignItems:"center"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#34c759",flexShrink:0,marginTop:2}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600}}>{s.type}</div>
                    <div style={{fontSize:10,color:"#86868b",marginTop:2}}>{s.garage}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:12,fontWeight:700}}>{s.cost.toLocaleString("fr-FR")} AED</div>
                    <div style={{fontSize:10,color:"#86868b"}}>{s.date} · {s.km.toLocaleString("fr-FR")} km</div>
                  </div>
                </div>
              )):(
                <div style={{fontSize:12,color:"#86868b",fontStyle:"italic"}}>Aucun service enregistré</div>
              )}
            </div>
          )}

          {/* ── FINANCE ── */}
          {tab==="finance"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px 32px",marginBottom:24}}>
                <Field label="Prix d'achat" value={v.purchaseAmount?`${v.purchaseAmount.toLocaleString("fr-FR")} AED`:"—"}/>
                <Field label="Date d'achat" value={v.purchaseDate}/>
                <Field label="Mode de financement" value={v.loanAmount>0?"Prêt bancaire":"Comptant"}/>
                <Field label="Banque" value={v.bank||"—"}/>
                {v.loanAmount>0&&<>
                  <Field label="Montant du prêt" value={`${v.loanAmount.toLocaleString("fr-FR")} AED`}/>
                  <Field label="Mensualité (EMI)" value={`${v.loanEMI.toLocaleString("fr-FR")} AED`}/>
                  <Field label="Durée" value={v.loanTenure?`${v.loanTenure} mois`:"—"}/>
                  <Field label="Taux d'intérêt" value={v.interestRate?`${(v.interestRate*100).toFixed(2)}%`:"—"}/>
                  <Field label="Fin de prêt" value={v.endOfLoan||"—"}/>
                </>}
              </div>
              {v.loanAmount>0&&(
                <div style={{background:"#f5f5f7",borderRadius:14,padding:"18px",marginBottom:20}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:12}}>Remboursement du prêt</div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:11,color:"#86868b"}}>Montant initial</span>
                    <span style={{fontSize:12,fontWeight:600}}>{v.loanAmount.toLocaleString("fr-FR")} AED</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:11,color:"#86868b"}}>EMI mensuel</span>
                    <span style={{fontSize:12,fontWeight:600,color:"#ff9500"}}>{v.loanEMI.toLocaleString("fr-FR")} AED</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:11,color:"#86868b"}}>Fin de prêt</span>
                    <span style={{fontSize:12,fontWeight:600}}>{v.endOfLoan||"—"}</span>
                  </div>
                </div>
              )}
              <div style={{fontSize:12,fontWeight:700,marginBottom:12}}>Assurance</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 32px"}}>
                <Field label="Compagnie" value={v.insurance}/>
                <Field label="Prime annuelle" value={v.insurancePayment?`${v.insurancePayment.toLocaleString("fr-FR")} AED`:"—"}/>
                <Field label="Date d'échéance" value={v.insuranceDue}/>
              </div>
            </div>
          )}

          {/* ── DÉPENSES ── */}
          {tab==="expenses"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:24}}>
                {[
                  {label:"Total dépenses",value:`${totalExpenses.toLocaleString("fr-FR")} AED`,color:"blue"},
                  {label:"Assurance annuelle",value:v.insurancePayment?`${v.insurancePayment.toLocaleString("fr-FR")} AED`:"—",color:"orange"},
                  {label:"Services / maint.",value:`${expenses.filter(e=>e.type==="Révision"||e.type==="Pneus").reduce((s,e)=>s+e.amount,0).toLocaleString("fr-FR")} AED`},
                ].map(k=>(
                  <div key={k.label} style={{background:"#f5f5f7",borderRadius:12,padding:"14px 16px"}}>
                    <div style={{fontSize:10,fontWeight:600,color:"#86868b",marginBottom:4}}>{k.label}</div>
                    <div style={{fontSize:18,fontWeight:800,color:k.color==="blue"?"#007aff":k.color==="orange"?"#ff9500":"#1d1d1f"}}>{k.value}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700}}>Historique des dépenses</div>
                <button style={{background:"#1d1d1f",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Ajouter</button>
              </div>
              {expenses.map((e,i)=>{
                const typeColor={Assurance:"#007aff",Carburant:"#34c759",Révision:"#ff9500",Pneus:"#af52de"}[e.type]||"#86868b";
                return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:"1px solid #f5f5f7"}}>
                    <div style={{width:32,height:32,borderRadius:8,background:`${typeColor}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:14}}>{e.type==="Carburant"?"⛽":e.type==="Assurance"?"🛡️":e.type==="Révision"?"🔧":"🔩"}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600}}>{e.type}</div>
                      <div style={{fontSize:10,color:"#86868b"}}>{e.date} · {e.ref}</div>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:typeColor}}>{e.amount.toLocaleString("fr-FR")} AED</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {tab==="docs"&&(
            <div>
              {[
                {label:"Mulkia Recto",icon:"🪪",desc:"Carte grise · Recto",uploaded:false},
                {label:"Mulkia Verso",icon:"🪪",desc:"Carte grise · Verso",uploaded:false},
                {label:"Assurance",icon:"🛡️",desc:`${v.insurance||"—"} · Expire ${v.insuranceDue||"—"}`,uploaded:true},
                {label:"Contrat de lease",icon:"📄",desc:v.hotel?`${v.hotel} · ${v.leaseEnd||"En cours"}`:"N/A",uploaded:v.hotel!=null},
                {label:"Contrat de prêt",icon:"🏦",desc:v.bank?`${v.bank} · ${v.endOfLoan||"—"}`:"Comptant",uploaded:v.loanAmount>0},
              ].map(doc=>(
                <div key={doc.label} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:"1px solid #f5f5f7"}}>
                  <div style={{width:44,height:44,borderRadius:12,background:doc.uploaded?"rgba(52,199,89,0.1)":"#f5f5f7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                    {doc.icon}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600}}>{doc.label}</div>
                    <div style={{fontSize:11,color:"#86868b",marginTop:2}}>{doc.desc}</div>
                  </div>
                  {doc.uploaded?(
                    <div style={{display:"flex",gap:8}}>
                      <button style={{background:"#f5f5f7",border:"none",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>👁 Voir</button>
                      <button style={{background:"#f5f5f7",border:"none",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>⬇️</button>
                    </div>
                  ):(
                    <label style={{background:"#1d1d1f",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                      📎 Uploader
                      <input type="file" style={{display:"none"}} accept=".pdf,.jpg,.png"/>
                    </label>
                  )}
                </div>
              ))}

              {/* ── BROCHURE PDF IA ── */}
              <div style={{marginTop:28,background:"linear-gradient(135deg,#0a0a0a,#2a2a2a)",borderRadius:20,padding:"24px",border:"1px solid rgba(255,255,255,0.08)"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
                  <div style={{fontSize:28}}>✨</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>Brochure client générée par IA</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:2}}>Upload jusqu'à 6 photos · Claude génère une belle fiche PDF prête à partager</div>
                  </div>
                </div>

                {/* Photo upload grid */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
                  {Array.from({length:6}).map((_,i)=>{
                    const p = photos[i];
                    return(
                      <div key={i} style={{aspectRatio:"4/3",borderRadius:10,overflow:"hidden",
                        background:p?"transparent":"rgba(255,255,255,0.06)",
                        border:`1px dashed ${p?"transparent":"rgba(255,255,255,0.15)"}`,
                        display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                        {p?(
                          <>
                            <img src={p.preview} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            <button onClick={()=>setPhotos(ph=>ph.filter((_,j)=>j!==i))}
                              style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,0.7)",color:"#fff",border:"none",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                          </>
                        ):(
                          <label style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:4}}>
                            <span style={{fontSize:20,opacity:0.4}}>📷</span>
                            <span style={{fontSize:9,color:"rgba(255,255,255,0.3)",fontWeight:500}}>Photo {i+1}</span>
                            <input type="file" accept="image/*" style={{display:"none"}} onChange={handlePhotos} multiple/>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Generate button */}
                <button onClick={generatePdf} disabled={pdfLoading}
                  style={{width:"100%",background:pdfLoading?"rgba(255,255,255,0.1)":"linear-gradient(135deg,#c9a84c,#f0d080)",
                    color:pdfLoading?"rgba(255,255,255,0.4)":"#1a0f00",border:"none",borderRadius:12,
                    padding:"14px",fontSize:14,fontWeight:800,cursor:pdfLoading?"not-allowed":"pointer",
                    fontFamily:"inherit",letterSpacing:"0.3px",transition:"all 0.2s"}}>
                  {pdfLoading?"⏳ Génération en cours...":"✨ Générer la brochure PDF"}
                </button>
                {photos.length===0&&!pdfLoading&&(
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",textAlign:"center",marginTop:8}}>
                    Sans photos · La brochure sera générée avec les infos du véhicule uniquement
                  </div>
                )}
              </div>

              {/* PDF RESULT */}
              {pdfHtml&&(
                <div style={{marginTop:20,background:"rgba(52,199,89,0.08)",borderRadius:16,padding:"20px",border:"1px solid rgba(52,199,89,0.2)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#34c759"}}>✓ Brochure générée !</div>
                      <div style={{fontSize:11,color:"#86868b",marginTop:2}}>Prête à imprimer ou enregistrer en PDF</div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={printPdf}
                        style={{background:"#1d1d1f",color:"#fff",border:"none",borderRadius:10,padding:"10px 18px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                        🖨️ Imprimer / PDF
                      </button>
                      <button onClick={()=>setPdfHtml(null)}
                        style={{background:"#f5f5f7",color:"#1d1d1f",border:"none",borderRadius:10,padding:"10px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                        ✕
                      </button>
                    </div>
                  </div>
                  <iframe srcDoc={pdfHtml} style={{width:"100%",height:400,border:"none",borderRadius:10,background:"#fff"}}/>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// FLEET VIEW
// ═══════════════════════════════════════════════════════════════════════════
function FleetView(){
  const [filterModel,setFilterModel]=useState("Tous");
  const [filterPos,setFilterPos]=useState("Tous");
  const [search,setSearch]=useState("");
  const [selectedVehicle,setSelectedVehicle]=useState(null);
  const [fleetData,setFleetData]=useState(null);
  const [fleetError,setFleetError]=useState(null);

  useEffect(()=>{
    fetchAllVehicles()
      .then(data=>setFleetData(data))
      .catch(err=>{
        console.error("Xano fleet error:",err);
        setFleetError(err.message);
        setFleetData(FLEET); // fallback données hardcodées
      });
  },[]);

  const FLEET_SOURCE = fleetData || [];

  // Derive vehicle type from model name
  const getType = v => {
    const m = (v.model||"").toLowerCase();
    if(m.includes("s-class")||m.includes("maybach")) return "S Class";
    if(m.includes("v-class")||m.includes("vito")||m.includes("falcon")||m.includes("v class")) return "V Class";
    if(m.includes("eqs")) return "EQS";
    if(m.includes("i7")||m.includes("7 series")||m.includes("735")||m.includes("730")) return "BMW 7";
    if(m.includes("520")||m.includes("5 series")) return "BMW 5";
    if(m.includes("suburban")||m.includes("escalade")||m.includes("yukon")) return "SUV";
    return "Autre";
  };

  const types=["Tous",...[...new Set(FLEET_SOURCE.map(getType))]];

  const serviceStatus = v => {
    if(!v.km||!v.lastServiceKm) return {label:"—",color:"#86868b",bg:"#f5f5f7"};
    const since=v.km-v.lastServiceKm;
    const p=since/v.serviceInterval;
    if(p>=1) return {label:"Dépassé",color:"#ff3b30",bg:"rgba(255,59,48,0.1)"};
    if(p>=0.8) return {label:"Bientôt",color:"#ff9500",bg:"rgba(255,149,0,0.1)"};
    return {label:"OK",color:"#34c759",bg:"rgba(52,199,89,0.1)"};
  };

  const filtered=FLEET_SOURCE.filter(v=>{
    if(filterModel!=="Tous"&&getType(v)!==filterModel) return false;
    if(filterPos!=="Tous"&&v.location!==filterPos) return false;
    if(search){
      const q=search.toLowerCase();
      if(!v.plate.toLowerCase().includes(q)&&!v.model.toLowerCase().includes(q)&&!(v.make||"").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalFleet=FLEET_SOURCE.length;
  const totalOffice=FLEET_SOURCE.filter(v=>v.location==="Office").length;
  const totalLease=FLEET_SOURCE.filter(v=>v.location==="Lease").length;
  const alerts=FLEET_SOURCE.filter(v=>serviceStatus(v).label==="Dépassé"||serviceStatus(v).label==="Bientôt");

  // Group by type for summary
  const byType=[...new Set(FLEET_SOURCE.map(getType))].map(t=>({
    type:t,
    total:FLEET_SOURCE.filter(v=>getType(v)===t).length,
    office:FLEET_SOURCE.filter(v=>getType(v)===t&&v.location==="Office").length,
    lease:FLEET_SOURCE.filter(v=>getType(v)===t&&v.location==="Lease").length,
  }));

  return(
    <div>
      {selectedVehicle&&<VehicleModal vehicle={selectedVehicle} onClose={()=>setSelectedVehicle(null)}/>}

      {/* Loading state */}
      {fleetData===null&&(
        <div style={{textAlign:"center",padding:"60px 0",color:"#86868b"}}>
          <div style={{fontSize:32,marginBottom:12}}>⏳</div>
          <div style={{fontSize:14,fontWeight:600}}>Chargement de la flotte...</div>
          <div style={{fontSize:11,marginTop:4}}>Connexion Xano en cours</div>
        </div>
      )}

      {/* Error banner */}
      {fleetError&&(
        <div style={{background:"rgba(255,149,0,0.1)",border:"1px solid rgba(255,149,0,0.3)",borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:12,color:"#ff9500"}}>
          ⚠️ Xano indisponible — données de démonstration affichées · {fleetError}
        </div>
      )}

      {fleetData!==null&&(
      <>
      <Sec mt={0}>Vue d'ensemble flotte</Sec>
      <div className="g4 fu d1">
        <Kpi label="Total véhicules" value={totalFleet}/>
        <Kpi label="Position office" value={totalOffice} color="blue" sub="disponibles dispatch"/>
        <Kpi label="Position lease" value={totalLease} color="orange" sub="affectés clients"/>
        <Kpi label="Alertes service" value={alerts.length} color={alerts.length>0?"red":"green"} sub={alerts.length>0?`${FLEET.filter(v=>serviceStatus(v).label==="Dépassé").length} dépassé(s)`:"Tout OK"}/>
      </div>

      <Sec>Répartition par type</Sec>
      <Card className="fu d2">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
          {byType.map(t=>(
            <div key={t.type} style={{background:"#f5f5f7",borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontSize:11,fontWeight:700,marginBottom:6}}>{t.type}</div>
              <div style={{fontSize:26,fontWeight:800,lineHeight:1,marginBottom:8}}>{t.total}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <span style={{fontSize:9,fontWeight:600,background:"rgba(0,122,255,0.1)",color:"#007aff",padding:"2px 6px",borderRadius:4}}>{t.office} office</span>
                <span style={{fontSize:9,fontWeight:600,background:"rgba(255,149,0,0.1)",color:"#ff9500",padding:"2px 6px",borderRadius:4}}>{t.lease} lease</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {alerts.length>0&&(
        <>
          <Sec>⚠️ Alertes maintenance</Sec>
          <Card className="fu d2" style={{borderLeft:"3px solid #ff3b30"}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>Véhicules à réviser</div>
            <div style={{fontSize:11,color:"#86868b",marginBottom:16}}>{alerts.length} véhicule{alerts.length>1?"s":""} — cliquer pour ouvrir la fiche</div>
            {alerts.map(v=>{
              const s=serviceStatus(v);
              const since=v.km-v.lastServiceKm;
              const remaining=v.serviceInterval-since;
              return(
                <div key={v.plate} onClick={()=>setSelectedVehicle(v)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #f5f5f7",cursor:"pointer"}}>
                  <div style={{minWidth:70,fontFamily:"monospace",fontSize:12,fontWeight:700}}>{v.plate}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600}}>{v.make} {v.model}</div>
                    <div style={{fontSize:10,color:"#86868b"}}>{v.location==="Lease"?`Lease · ${v.hotel}`:"Office"}</div>
                  </div>
                  <div style={{textAlign:"right",minWidth:80}}>
                    <div style={{fontSize:12,fontWeight:700,color:remaining>0?"#ff9500":"#ff3b30"}}>{remaining>0?`${fmt(remaining)} km restants`:`+${fmt(Math.abs(remaining))} km dépassé`}</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:6,background:s.bg,color:s.color,flexShrink:0}}>{s.label}</span>
                </div>
              );
            })}
          </Card>
        </>
      )}

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:28,marginBottom:10}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"#86868b"}}>Liste des véhicules</div>
        <button onClick={()=>alert("Formulaire nouveau véhicule — à connecter")} style={{
          background:"#1d1d1f",color:"#fff",border:"none",borderRadius:10,
          padding:"9px 16px",fontSize:13,fontWeight:700,cursor:"pointer",
          fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,flexShrink:0
        }}>＋ Nouveau véhicule</button>
      </div>

      {/* FILTERS */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        <input placeholder="🔍 Immat., marque, modèle..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:"9px 12px",fontSize:13,fontFamily:"inherit",outline:"none",flex:1,minWidth:140}}/>
        <select value={filterModel} onChange={e=>setFilterModel(e.target.value)}
          style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:"9px 12px",fontSize:13,fontFamily:"inherit",cursor:"pointer",outline:"none"}}>
          {types.map(t=><option key={t}>{t}</option>)}
        </select>
        <select value={filterPos} onChange={e=>setFilterPos(e.target.value)}
          style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:"9px 12px",fontSize:13,fontFamily:"inherit",cursor:"pointer",outline:"none"}}>
          {["Tous","Office","Lease"].map(p=><option key={p}>{p}</option>)}
        </select>
      </div>
      <div style={{fontSize:11,color:"#86868b",marginBottom:12}}>{filtered.length} véhicule{filtered.length>1?"s":""}</div>

      {/* CARDS — visible on all screen sizes, tap-friendly on mobile */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(v=>{
          const s=serviceStatus(v);
          const colorDot={Black:"#1d1d1f",White:"#e8e8e8",Blue:"#007aff",Beige:"#c8b89a",Brown:"#8b5e3c",Red:"#ff3b30",Grey:"#86868b"}[v.extColor]||"#d1d1d6";
          return(
            <div key={v.plate} onClick={()=>setSelectedVehicle(v)}
              style={{background:"#fff",borderRadius:14,padding:"14px 16px",
                boxShadow:"0 1px 3px rgba(0,0,0,0.06)",cursor:"pointer",
                display:"flex",alignItems:"center",gap:12,
                borderLeft:`3px solid ${s.color==="#34c759"?"#e5e5e5":s.color}`
              }}
              onMouseEnter={e=>e.currentTarget.style.background="#f9f9f9"}
              onMouseLeave={e=>e.currentTarget.style.background="#fff"}
            >
              {/* Color dot */}
              <div style={{width:36,height:36,borderRadius:10,background:colorDot,
                border:"2px solid rgba(0,0,0,0.08)",flexShrink:0}}/>

              {/* Main info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                  <span style={{fontFamily:"monospace",fontSize:12,fontWeight:700,background:"#f5f5f7",padding:"2px 7px",borderRadius:5}}>{v.plate}</span>
                  <span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:5,
                    background:v.location==="Office"?"rgba(0,122,255,0.1)":"rgba(255,149,0,0.1)",
                    color:v.location==="Office"?"#007aff":"#ff9500"}}>
                    {v.location==="Office"?"Office":`Lease · ${v.hotel||""}`}
                  </span>
                </div>
                <div style={{fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.model}</div>
                <div style={{fontSize:11,color:"#86868b",marginTop:1}}>{v.make} · {v.year} · {v.fuel==="Electric"?"⚡":"⛽"} {v.fuel}</div>
              </div>

              {/* Right: km + service */}
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700}}>{v.km?`${fmt(v.km)} km`:"— km"}</div>
                <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:5,
                  background:s.bg,color:s.color,display:"inline-block",marginTop:4}}>
                  {s.label}
                </span>
              </div>

              {/* Arrow */}
              <div style={{color:"#d1d1d6",fontSize:18,flexShrink:0}}>›</div>
            </div>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK-IN / CHECK-OUT MODULE
// ═══════════════════════════════════════════════════════════════════════════

// Simulated state store (replaces Xano in production)
// Structure: { [plate]: { driverId, driverName, vehiclePlate, kmStart, fuelStart, locationStart, startTime, problem } }
const CHECKIN_STORE = {};

// Simulated km history per vehicle (last check-out km)
const KM_HISTORY = {
  "L29741": 84500,
  "L29673": 84502,
  "L25158": 13480,
  "L29740": 17780,
};

// Mock drivers list
const DRIVERS_LIST = [
  {id:"d01",name:"Shabir"},
  {id:"d02",name:"Sumesh Soman"},
  {id:"d03",name:"Poiyel Sackeer"},
  {id:"d04",name:"Rajan Acharya"},
  {id:"d05",name:"Riyas Alipetta"},
  {id:"d06",name:"Kamran Khan"},
  {id:"d07",name:"Kene Richard"},
  {id:"d08",name:"MG Riju"},
  {id:"d09",name:"Naseem K."},
  {id:"d10",name:"Shah Bilal"},
  {id:"d11",name:"Ahmed Hassan"},
  {id:"d12",name:"Mohammed Ali"},
];

const FUEL_LEVELS = ["1/4","1/2","3/4","Plein"];
const FUEL_PCT = {"1/4":25,"1/2":50,"3/4":75,"Plein":100};

const PROBLEM_CATS = [
  {id:"body",   icon:"🚗", label:"Carrosserie"},
  {id:"mech",   icon:"🔧", label:"Mécanique"},
  {id:"clean",  icon:"🧹", label:"Propreté"},
  {id:"fuel",   icon:"⛽", label:"Carburant"},
  {id:"equip",  icon:"📱", label:"Équipement"},
  {id:"other",  icon:"❗", label:"Autre"},
];

function FuelBar({level}){
  const p = FUEL_PCT[level]||0;
  const color = p<=25?"#ff3b30":p<=50?"#ff9500":"#34c759";
  return(
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,background:"#f5f5f7",height:6,borderRadius:3,overflow:"hidden"}}>
        <div style={{width:`${p}%`,height:"100%",background:color,borderRadius:3,transition:"width 0.3s"}}/>
      </div>
      <span style={{fontSize:11,fontWeight:700,color,minWidth:28}}>{level}</span>
    </div>
  );
}

// ── CHECK-IN FORM ────────────────────────────────────────────────────────────
function CheckInForm({onConfirm, loggedDriver}){
  const [plate,setPlate]     = useState("");
  const [km,setKm]           = useState("");
  const [fuel,setFuel]       = useState("Plein");
  const [location,setLoc]    = useState("");
  const [hasProblem,setProb] = useState(false);
  const [probCat,setProbCat] = useState("");
  const [probNote,setProbNote]= useState("");
  const [probPhoto,setPhoto] = useState(null);
  const [kmAlert,setKmAlert] = useState(null);
  const [submitted,setSubmitted]=useState(false);

  // Filter fleet to Office vehicles only (available for dispatch)
  const availableFleet = FLEET.filter(v=>v.location==="Office" && !CHECKIN_STORE[v.plate]);

  const checkKm = (val,p) => {
    const prev = KM_HISTORY[p];
    if(prev && val && parseInt(val) - prev > 10){
      setKmAlert({prev, current: parseInt(val), diff: parseInt(val)-prev});
    } else {
      setKmAlert(null);
    }
  };

  const handlePlate = (p) => {
    setPlate(p);
    setKm(""); // toujours vide — chauffeur saisit lui-même
    setKmAlert(null);
  };

  const handleKm = (val) => {
    setKm(val);
    checkKm(val, plate);
  };

  const handlePhoto = (e) => {
    const f = e.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result);
    r.readAsDataURL(f);
  };

  const isValid = plate && km && location;

  const handleSubmit = () => {
    if(!isValid) return;
    const entry = {
      driverName: loggedDriver.name,
      driverId: loggedDriver.id,
      vehiclePlate: plate,
      kmStart: parseInt(km),
      fuelStart: fuel,
      locationStart: location,
      startTime: new Date().toISOString(),
      problem: hasProblem?{cat:probCat,note:probNote,photo:probPhoto}:null,
      kmAlert: kmAlert,
    };
    CHECKIN_STORE[plate] = entry;
    setSubmitted(true);
    setTimeout(()=>onConfirm(entry), 1200);
  };

  if(submitted) return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",gap:16}}>
      <div style={{width:72,height:72,borderRadius:"50%",background:"rgba(52,199,89,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>✓</div>
      <div style={{fontSize:20,fontWeight:800,color:"#34c759"}}>Check-In confirmé !</div>
      <div style={{fontSize:13,color:"#86868b"}}>Chargement du tableau de bord…</div>
    </div>
  );

  return(
    <div>
      <Sec mt={0}>Nouveau Check-In</Sec>

      {/* DRIVER — lecture seule, vient du login */}
      <Card style={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>👤 Chauffeur</div>
        <div style={{display:"flex",alignItems:"center",gap:12,background:"#f5f5f7",borderRadius:10,padding:"12px 14px"}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:"#1d1d1f",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{color:"#fff",fontSize:14,fontWeight:700}}>{loggedDriver.name[0]}</span>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700}}>{loggedDriver.name}</div>
            <div style={{fontSize:11,color:"#86868b",marginTop:1}}>Connecté · Session active</div>
          </div>
          <div style={{fontSize:10,fontWeight:600,background:"rgba(52,199,89,0.12)",color:"#34c759",padding:"3px 9px",borderRadius:6,flexShrink:0}}>● En ligne</div>
        </div>
      </Card>

      {/* VEHICLE */}
      <Card style={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>🚘 Véhicule</div>
        <select value={plate} onChange={e=>handlePlate(e.target.value)}
          style={{width:"100%",background:"#f5f5f7",border:"none",borderRadius:10,padding:"12px 14px",fontSize:14,fontFamily:"inherit",outline:"none",cursor:"pointer",color:plate?"#1d1d1f":"#86868b",appearance:"none",marginBottom:plate?12:0}}>
          <option value="">Sélectionner un véhicule…</option>
          {availableFleet.map(v=>(
            <option key={v.plate} value={v.plate}>{v.plate} · {v.model} · {v.extColor}</option>
          ))}
        </select>
        {plate&&(()=>{
          const v=FLEET.find(f=>f.plate===plate);
          return v?(
            <div style={{background:"#f5f5f7",borderRadius:10,padding:"10px 14px",display:"flex",gap:12,alignItems:"center"}}>
              <div style={{width:32,height:32,borderRadius:8,background:{"Black":"#1d1d1f","White":"#e8e8e8","Blue":"#007aff","Beige":"#c8b89a","Brown":"#8b5e3c"}[v.extColor]||"#d1d1d6",border:"2px solid rgba(0,0,0,0.08)",flexShrink:0}}/>
              <div>
                <div style={{fontSize:12,fontWeight:700}}>{v.make} {v.model}</div>
                <div style={{fontSize:10,color:"#86868b"}}>{v.year} · {v.fuel==="Electric"?"⚡ Électrique":"⛽ "+v.fuel}</div>
              </div>
            </div>
          ):null;
        })()}
      </Card>

      {/* KM + FUEL */}
      <Card style={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>📍 Kilométrage & Carburant</div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:600,color:"#86868b",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Kilométrage actuel</div>
          <input type="number" value={km} onChange={e=>handleKm(e.target.value)} placeholder="Ex: 84500"
            style={{width:"100%",background:"#f5f5f7",border:kmAlert?"2px solid #ff9500":"2px solid transparent",borderRadius:10,padding:"12px 14px",fontSize:16,fontWeight:700,fontFamily:"monospace",outline:"none",boxSizing:"border-box",color:"#1d1d1f"}}/>
          {kmAlert&&(
            <div style={{marginTop:8,background:"rgba(255,149,0,0.1)",border:"1px solid rgba(255,149,0,0.3)",borderRadius:8,padding:"8px 12px",display:"flex",gap:8,alignItems:"flex-start"}}>
              <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"#ff9500"}}>Écart kilométrique détecté</div>
                <div style={{fontSize:11,color:"#86868b",marginTop:2}}>Dernier check-out : {kmAlert.prev.toLocaleString("fr-FR")} km → Maintenant : {kmAlert.current.toLocaleString("fr-FR")} km</div>
                <div style={{fontSize:11,fontWeight:700,color:"#ff3b30",marginTop:2}}>+{kmAlert.diff} km non expliqués · Une alerte sera envoyée au manager</div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div style={{fontSize:11,fontWeight:600,color:"#86868b",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.5px"}}>Niveau carburant</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {FUEL_LEVELS.map(f=>(
              <button key={f} onClick={()=>setFuel(f)}
                style={{background:fuel===f?"#1d1d1f":"#f5f5f7",color:fuel===f?"#fff":"#1d1d1f",border:"none",borderRadius:10,padding:"10px 4px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
                {f}
              </button>
            ))}
          </div>
          <div style={{marginTop:10}}>
            <FuelBar level={fuel}/>
          </div>
        </div>
      </Card>

      {/* LOCATION */}
      <Card style={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>📍 Localisation de départ</div>
        <input type="text" value={location} onChange={e=>setLoc(e.target.value)} placeholder="Ex: Office CHABE · DIFC · Four Seasons…"
          style={{width:"100%",background:"#f5f5f7",border:"none",borderRadius:10,padding:"12px 14px",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",color:"#1d1d1f"}}/>
      </Card>

      {/* PROBLEM */}
      <Card style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:hasProblem?12:0}}>
          <div style={{fontSize:13,fontWeight:700}}>⚠️ Signaler un problème</div>
          <button onClick={()=>setProb(!hasProblem)}
            style={{background:hasProblem?"rgba(255,59,48,0.1)":"#f5f5f7",color:hasProblem?"#ff3b30":"#86868b",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
            {hasProblem?"Annuler":"+ Signaler"}
          </button>
        </div>
        {hasProblem&&(
          <div>
            <div style={{fontSize:11,fontWeight:600,color:"#86868b",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.5px"}}>Catégorie</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:12}}>
              {PROBLEM_CATS.map(c=>(
                <button key={c.id} onClick={()=>setProbCat(c.id)}
                  style={{background:probCat===c.id?"#1d1d1f":"#f5f5f7",color:probCat===c.id?"#fff":"#1d1d1f",border:"none",borderRadius:10,padding:"10px 6px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <span style={{fontSize:18}}>{c.icon}</span>
                  <span style={{fontSize:10}}>{c.label}</span>
                </button>
              ))}
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:600,color:"#86868b",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Description</div>
              <textarea value={probNote} onChange={e=>setProbNote(e.target.value)} placeholder="Décrire le problème…"
                style={{width:"100%",background:"#f5f5f7",border:"none",borderRadius:10,padding:"12px 14px",fontSize:13,fontFamily:"inherit",outline:"none",resize:"none",height:80,boxSizing:"border-box",color:"#1d1d1f"}}/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:"#86868b",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Photo (optionnel)</div>
              {probPhoto?(
                <div style={{position:"relative",display:"inline-block"}}>
                  <img src={probPhoto} style={{width:120,height:80,objectFit:"cover",borderRadius:8}}/>
                  <button onClick={()=>setPhoto(null)}
                    style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",borderRadius:"50%",width:20,height:20,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                </div>
              ):(
                <label style={{display:"flex",alignItems:"center",gap:8,background:"#f5f5f7",border:"1px dashed #d1d1d6",borderRadius:10,padding:"10px 14px",cursor:"pointer",width:"fit-content"}}>
                  <span>📷</span>
                  <span style={{fontSize:12,color:"#86868b",fontWeight:500}}>Ajouter une photo</span>
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
                </label>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* SUBMIT */}
      <button onClick={handleSubmit} disabled={!isValid}
        style={{width:"100%",background:isValid?"#1d1d1f":"#d1d1d6",color:"#fff",border:"none",borderRadius:16,padding:"18px",fontSize:16,fontWeight:800,cursor:isValid?"pointer":"not-allowed",fontFamily:"inherit",letterSpacing:"-0.3px",transition:"all 0.2s",boxShadow:isValid?"0 4px 20px rgba(0,0,0,0.2)":"none"}}>
        ✓ Confirmer le Check-In
      </button>
    </div>
  );
}

// ── CHECK-OUT FORM ───────────────────────────────────────────────────────────
function CheckOutForm({session, onConfirm}){
  const [kmEnd,setKmEnd]     = useState("");
  const [fuel,setFuel]       = useState("Plein");
  const [location,setLoc]    = useState("");
  const [hasProblem,setProb] = useState(false);
  const [probCat,setProbCat] = useState("");
  const [probNote,setProbNote]= useState("");
  const [probPhoto,setPhoto] = useState(null);
  const [submitted,setSubmitted]=useState(false);

  const v = FLEET.find(f=>f.plate===session.vehiclePlate);
  const startTime = new Date(session.startTime);
  const now = new Date();
  const durationMin = Math.round((now - startTime) / 60000);
  const durationStr = durationMin < 60
    ? `${durationMin} min`
    : `${Math.floor(durationMin/60)}h${String(durationMin%60).padStart(2,"0")}`;

  const kmDiff = kmEnd && parseInt(kmEnd) > session.kmStart ? parseInt(kmEnd) - session.kmStart : null;

  const handlePhoto = (e) => {
    const f = e.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result);
    r.readAsDataURL(f);
  };

  const isValid = kmEnd && location && parseInt(kmEnd) >= session.kmStart;

  const handleSubmit = () => {
    if(!isValid) return;
    // Update km history for future alert check
    KM_HISTORY[session.vehiclePlate] = parseInt(kmEnd);
    delete CHECKIN_STORE[session.vehiclePlate];
    setSubmitted(true);
    setTimeout(()=>onConfirm({
      ...session,
      kmEnd: parseInt(kmEnd),
      fuelEnd: fuel,
      locationEnd: location,
      endTime: new Date().toISOString(),
      kmDiff,
      problem: hasProblem?{cat:probCat,note:probNote,photo:probPhoto}:null,
    }), 1200);
  };

  if(submitted) return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",gap:16}}>
      <div style={{width:72,height:72,borderRadius:"50%",background:"rgba(52,199,89,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>✓</div>
      <div style={{fontSize:20,fontWeight:800,color:"#34c759"}}>Check-Out confirmé !</div>
      <div style={{fontSize:13,color:"#86868b"}}>Durée : {durationStr} · {kmDiff?`+${kmDiff.toLocaleString("fr-FR")} km`:""}</div>
    </div>
  );

  const colorDot = {"Black":"#1d1d1f","White":"#e8e8e8","Blue":"#007aff","Beige":"#c8b89a","Brown":"#8b5e3c"};

  return(
    <div>
      {/* Active session card */}
      <div style={{background:"linear-gradient(135deg,#1d1d1f,#3a3a3c)",borderRadius:20,padding:"24px",marginBottom:20,boxShadow:"0 4px 24px rgba(0,0,0,0.15)"}}>
        <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.4)",letterSpacing:"1px",textTransform:"uppercase",marginBottom:12}}>Session en cours</div>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
          <div style={{width:44,height:44,borderRadius:12,background:colorDot[v?.extColor]||"#555",border:"2px solid rgba(255,255,255,0.15)",flexShrink:0}}/>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:"#fff",letterSpacing:"-0.5px"}}>{v?.model||session.vehiclePlate}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:2}}>{session.vehiclePlate} · {v?.make} · {v?.year}</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {[
            {label:"Chauffeur",value:session.driverName},
            {label:"Départ",value:startTime.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})},
            {label:"Durée",value:durationStr},
          ].map(s=>(
            <div key={s.label} style={{background:"rgba(255,255,255,0.06)",borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>{s.label}</div>
              <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Km départ</div>
            <div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:"monospace"}}>{session.kmStart.toLocaleString("fr-FR")} km</div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Carburant départ</div>
            <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{session.fuelStart}</div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Localisation départ</div>
            <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.7)",maxWidth:"60%",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{session.locationStart}</div>
          </div>
        </div>
      </div>

      <Sec mt={0}>Check-Out — Informations finales</Sec>

      {/* KM FINAL */}
      <Card style={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>📍 Kilométrage final</div>
        <input type="number" value={kmEnd} onChange={e=>setKmEnd(e.target.value)} placeholder={`Min. ${session.kmStart.toLocaleString("fr-FR")} km`}
          style={{width:"100%",background:"#f5f5f7",border:"none",borderRadius:10,padding:"12px 14px",fontSize:16,fontWeight:700,fontFamily:"monospace",outline:"none",boxSizing:"border-box",color:"#1d1d1f"}}/>
        {kmDiff!=null&&(
          <div style={{marginTop:8,background:"rgba(52,199,89,0.08)",borderRadius:8,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,color:"#86868b"}}>Distance parcourue</span>
            <span style={{fontSize:14,fontWeight:800,color:"#34c759"}}>+{kmDiff.toLocaleString("fr-FR")} km</span>
          </div>
        )}
        {kmEnd && parseInt(kmEnd) < session.kmStart &&(
          <div style={{marginTop:8,background:"rgba(255,59,48,0.08)",borderRadius:8,padding:"8px 12px"}}>
            <span style={{fontSize:12,color:"#ff3b30",fontWeight:600}}>⛔ Le kilométrage final ne peut pas être inférieur au départ</span>
          </div>
        )}
      </Card>

      {/* FUEL FINAL */}
      <Card style={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>⛽ Niveau carburant final</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10}}>
          {FUEL_LEVELS.map(f=>(
            <button key={f} onClick={()=>setFuel(f)}
              style={{background:fuel===f?"#1d1d1f":"#f5f5f7",color:fuel===f?"#fff":"#1d1d1f",border:"none",borderRadius:10,padding:"10px 4px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
              {f}
            </button>
          ))}
        </div>
        <FuelBar level={fuel}/>
      </Card>

      {/* LOCATION */}
      <Card style={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>📍 Localisation finale</div>
        <input type="text" value={location} onChange={e=>setLoc(e.target.value)} placeholder="Ex: Office CHABE · Hôtel · Aéroport…"
          style={{width:"100%",background:"#f5f5f7",border:"none",borderRadius:10,padding:"12px 14px",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",color:"#1d1d1f"}}/>
      </Card>

      {/* PROBLEM */}
      <Card style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:hasProblem?12:0}}>
          <div style={{fontSize:13,fontWeight:700}}>⚠️ Signaler un problème</div>
          <button onClick={()=>setProb(!hasProblem)}
            style={{background:hasProblem?"rgba(255,59,48,0.1)":"#f5f5f7",color:hasProblem?"#ff3b30":"#86868b",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
            {hasProblem?"Annuler":"+ Signaler"}
          </button>
        </div>
        {hasProblem&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:12}}>
              {PROBLEM_CATS.map(c=>(
                <button key={c.id} onClick={()=>setProbCat(c.id)}
                  style={{background:probCat===c.id?"#1d1d1f":"#f5f5f7",color:probCat===c.id?"#fff":"#1d1d1f",border:"none",borderRadius:10,padding:"10px 6px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <span style={{fontSize:18}}>{c.icon}</span>
                  <span style={{fontSize:10}}>{c.label}</span>
                </button>
              ))}
            </div>
            <textarea value={probNote} onChange={e=>setProbNote(e.target.value)} placeholder="Décrire le problème…"
              style={{width:"100%",background:"#f5f5f7",border:"none",borderRadius:10,padding:"12px 14px",fontSize:13,fontFamily:"inherit",outline:"none",resize:"none",height:80,boxSizing:"border-box",color:"#1d1d1f",marginBottom:10}}/>
            {probPhoto?(
              <div style={{position:"relative",display:"inline-block"}}>
                <img src={probPhoto} style={{width:120,height:80,objectFit:"cover",borderRadius:8}}/>
                <button onClick={()=>setPhoto(null)}
                  style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",borderRadius:"50%",width:20,height:20,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>
            ):(
              <label style={{display:"flex",alignItems:"center",gap:8,background:"#f5f5f7",border:"1px dashed #d1d1d6",borderRadius:10,padding:"10px 14px",cursor:"pointer",width:"fit-content"}}>
                <span>📷</span>
                <span style={{fontSize:12,color:"#86868b",fontWeight:500}}>Ajouter une photo</span>
                <input type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
              </label>
            )}
          </div>
        )}
      </Card>

      {/* SUBMIT */}
      <button onClick={handleSubmit} disabled={!isValid}
        style={{width:"100%",background:isValid?"#ff3b30":"#d1d1d6",color:"#fff",border:"none",borderRadius:16,padding:"18px",fontSize:16,fontWeight:800,cursor:isValid?"pointer":"not-allowed",fontFamily:"inherit",letterSpacing:"-0.3px",transition:"all 0.2s",boxShadow:isValid?"0 4px 20px rgba(255,59,48,0.3)":"none"}}>
        ✓ Confirmer le Check-Out
      </button>
    </div>
  );
}

// ── MANAGER MONITOR ──────────────────────────────────────────────────────────
function ManagerMonitor({sessions, kmAlerts, history}){
  const now = new Date();
  return(
    <div>
      {/* KM ALERTS */}
      {kmAlerts.length > 0 &&(
        <>
          <Sec mt={0}>🚨 Alertes kilométriques</Sec>
          {kmAlerts.map((a,i)=>(
            <div key={i} style={{background:"rgba(255,59,48,0.06)",border:"1px solid rgba(255,59,48,0.2)",borderRadius:14,padding:"14px 16px",marginBottom:8,display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:24,flexShrink:0}}>⚠️</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:"#ff3b30"}}>{a.plate} · {a.diff} km non expliqués</div>
                <div style={{fontSize:11,color:"#86868b",marginTop:3}}>Dernier check-out : {a.prev.toLocaleString("fr-FR")} km → Check-in : {a.current.toLocaleString("fr-FR")} km</div>
                <div style={{fontSize:11,color:"#86868b",marginTop:1}}>Chauffeur : {a.driverName}</div>
              </div>
              <div style={{fontSize:10,color:"#86868b",whiteSpace:"nowrap",flexShrink:0,paddingTop:2}}>{a.time}</div>
            </div>
          ))}
        </>
      )}

      {/* ACTIVE SESSIONS */}
      <Sec mt={kmAlerts.length>0?20:0}>🟢 Véhicules en circulation</Sec>
      {sessions.length === 0 ? (
        <Card>
          <div style={{textAlign:"center",padding:"24px 0",color:"#86868b",fontSize:13}}>Aucun véhicule en circulation actuellement</div>
        </Card>
      ):(
        sessions.map((s,i)=>{
          const durationMin = Math.round((now - new Date(s.startTime)) / 60000);
          const durationStr = durationMin < 60 ? `${durationMin} min` : `${Math.floor(durationMin/60)}h${String(durationMin%60).padStart(2,"0")}`;
          const v = FLEET.find(f=>f.plate===s.vehiclePlate);
          const colorDot = {"Black":"#1d1d1f","White":"#e8e8e8","Blue":"#007aff","Beige":"#c8b89a","Brown":"#8b5e3c"};
          return(
            <div key={s.vehiclePlate} style={{background:"#fff",borderRadius:14,padding:"14px 16px",marginBottom:8,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",display:"flex",gap:12,alignItems:"center",borderLeft:"3px solid #34c759"}}>
              <div style={{width:36,height:36,borderRadius:10,background:colorDot[v?.extColor]||"#555",border:"2px solid rgba(0,0,0,0.08)",flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                  <span style={{fontFamily:"monospace",fontSize:12,fontWeight:700,background:"#f5f5f7",padding:"2px 7px",borderRadius:5}}>{s.vehiclePlate}</span>
                  <span style={{fontSize:11,fontWeight:600,color:"#34c759"}}>● En cours</span>
                </div>
                <div style={{fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.driverName}</div>
                <div style={{fontSize:10,color:"#86868b",marginTop:1}}>{v?.model} · Départ: {new Date(s.startTime).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})} · {s.kmStart.toLocaleString("fr-FR")} km · {s.locationStart}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:14,fontWeight:800,color:"#007aff"}}>{durationStr}</div>
                <div style={{fontSize:10,color:"#86868b",marginTop:2}}>{FUEL_LEVELS.map(f=>f===s.fuelStart?<span key={f} style={{color:"#34c759"}}>{f}</span>:null)}</div>
              </div>
            </div>
          );
        })
      )}

      {/* HISTORY */}
      {history.length > 0 &&(
        <>
          <Sec>📋 Historique du jour</Sec>
          {history.map((h,i)=>{
            const dur = Math.round((new Date(h.endTime)-new Date(h.startTime))/60000);
            const durStr = dur<60?`${dur} min`:`${Math.floor(dur/60)}h${String(dur%60).padStart(2,"0")}`;
            return(
              <div key={i} style={{background:"#fff",borderRadius:12,padding:"12px 14px",marginBottom:6,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",display:"flex",gap:12,alignItems:"center"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
                    <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,background:"#f5f5f7",padding:"2px 6px",borderRadius:4}}>{h.vehiclePlate}</span>
                    {h.problem&&<span style={{fontSize:9,fontWeight:700,background:"rgba(255,59,48,0.1)",color:"#ff3b30",padding:"2px 6px",borderRadius:4}}>⚠️ Problème</span>}
                  </div>
                  <div style={{fontSize:12,fontWeight:600}}>{h.driverName}</div>
                  <div style={{fontSize:10,color:"#86868b",marginTop:1}}>{new Date(h.startTime).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})} → {new Date(h.endTime).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})} · {durStr}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:700}}>{h.kmDiff?`+${h.kmDiff.toLocaleString("fr-FR")} km`:"—"}</div>
                  <div style={{fontSize:10,color:"#86868b",marginTop:1}}>{h.kmStart?.toLocaleString("fr-FR")} → {h.kmEnd?.toLocaleString("fr-FR")} km</div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── CHECK-IN VIEW (main container) ───────────────────────────────────────────
function CheckInView(){
  const [role,setRole]         = useState("manager");
  const [selectedDriverId,setSelectedDriverId] = useState(DRIVERS_LIST[0].id); // demo: simule le login chauffeur
  const [activeSessions,setActiveSessions] = useState([]);
  const [history,setHistory]   = useState([]);
  const [kmAlerts,setKmAlerts] = useState([]);
  const [mySession,setMySession] = useState(null);

  // Le chauffeur "connecté" — en prod viendra de l'auth Xano
  const loggedDriver = role==="driver"
    ? DRIVERS_LIST.find(d=>d.id===selectedDriverId)||DRIVERS_LIST[0]
    : null;

  const syncSessions = () => setActiveSessions(Object.values(CHECKIN_STORE));

  const handleCheckIn = (entry) => {
    if(entry.kmAlert){
      setKmAlerts(prev=>[...prev,{
        plate: entry.vehiclePlate,
        prev: entry.kmAlert.prev,
        current: entry.kmAlert.current,
        diff: entry.kmAlert.diff,
        driverName: entry.driverName,
        time: new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}),
      }]);
    }
    syncSessions();
    setMySession(entry);
  };

  const handleCheckOut = (entry) => {
    setHistory(prev=>[entry,...prev]);
    syncSessions();
    setMySession(null);
  };

  const driverHasActive = mySession != null;

  return(
    <div>
      {/* DEMO BANNER */}
      <div style={{background:"rgba(255,149,0,0.08)",border:"1px solid rgba(255,149,0,0.2)",borderRadius:12,padding:"10px 14px",marginBottom:20,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{fontSize:11,color:"#ff9500",fontWeight:600,flexShrink:0}}>🎛 Mode demo</div>
        <div style={{display:"flex",gap:4,background:"rgba(0,0,0,0.05)",borderRadius:8,padding:2,flexShrink:0}}>
          {["manager","driver"].map(r=>(
            <button key={r} onClick={()=>{setRole(r);setMySession(null);}}
              style={{background:role===r?"#fff":"transparent",border:"none",borderRadius:6,padding:"5px 12px",fontSize:12,fontWeight:role===r?700:400,color:role===r?"#1d1d1f":"#86868b",cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",boxShadow:role===r?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>
              {r==="manager"?"👔 Manager":"🚗 Chauffeur"}
            </button>
          ))}
        </div>
        {/* Sélecteur uniquement côté manager pour simuler le login — invisible en mode driver */}
        {role==="manager"&&(
          <select value={selectedDriverId} onChange={e=>setSelectedDriverId(e.target.value)}
            style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:8,padding:"5px 10px",fontSize:12,fontFamily:"inherit",outline:"none",cursor:"pointer",color:"#1d1d1f",flexShrink:0}}>
            <option value="">— Simuler login chauffeur —</option>
            {DRIVERS_LIST.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
      </div>

      {/* ── MANAGER VIEW ── */}
      {role==="manager"&&(
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontSize:22,fontWeight:800,letterSpacing:"-0.5px"}}>Check-In Monitor</div>
              <div style={{fontSize:12,color:"#86868b",marginTop:2}}>Suivi temps réel · {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <div style={{background:"#fff",borderRadius:12,padding:"10px 16px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",textAlign:"center"}}>
                <div style={{fontSize:10,color:"#86868b",fontWeight:600,textTransform:"uppercase"}}>Actifs</div>
                <div style={{fontSize:22,fontWeight:800,color:"#34c759"}}>{activeSessions.length}</div>
              </div>
              <div style={{background:"#fff",borderRadius:12,padding:"10px 16px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",textAlign:"center"}}>
                <div style={{fontSize:10,color:"#86868b",fontWeight:600,textTransform:"uppercase"}}>Alertes</div>
                <div style={{fontSize:22,fontWeight:800,color:kmAlerts.length>0?"#ff3b30":"#34c759"}}>{kmAlerts.length}</div>
              </div>
              <div style={{background:"#fff",borderRadius:12,padding:"10px 16px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",textAlign:"center"}}>
                <div style={{fontSize:10,color:"#86868b",fontWeight:600,textTransform:"uppercase"}}>Terminés</div>
                <div style={{fontSize:22,fontWeight:800}}>{history.length}</div>
              </div>
            </div>
          </div>
          <ManagerMonitor sessions={activeSessions} kmAlerts={kmAlerts} history={history}/>
        </div>
      )}

      {/* ── DRIVER VIEW ── */}
      {role==="driver"&&(
        <div>
          <div style={{fontSize:22,fontWeight:800,letterSpacing:"-0.5px",marginBottom:4}}>
            {driverHasActive?"Session en cours":"Bonjour, "+loggedDriver.name.split(" ")[0]+" 👋"}
          </div>
          <div style={{fontSize:12,color:"#86868b",marginBottom:20}}>
            {driverHasActive?`${mySession.vehiclePlate} · En route depuis ${new Date(mySession.startTime).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}`:"Aucune session active · Prêt pour le check-in"}
          </div>
          {!driverHasActive
            ? <CheckInForm onConfirm={handleCheckIn} loggedDriver={loggedDriver}/>
            : <CheckOutForm session={mySession} onConfirm={handleCheckOut}/>
          }
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App(){
  const [view,setView]=useState("daily");
  const tabs=[{id:"daily",label:"Daily"},{id:"monthly",label:"Monthly"},{id:"annual",label:"Annual"},{id:"fleet",label:"Fleet"},{id:"checkin",label:"Check-In"}];
  return(
    <div style={{minHeight:"100vh",background:"#f5f5f7"}}>
      <style>{css}</style>
      <nav style={{background:"rgba(255,255,255,0.85)",backdropFilter:"saturate(180%) blur(20px)",WebkitBackdropFilter:"saturate(180%) blur(20px)",borderBottom:"1px solid rgba(0,0,0,0.08)",position:"sticky",top:0,zIndex:100,height:52}}>
        <div className="npd" style={{padding:"0 32px",height:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",maxWidth:1200,margin:"0 auto",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#1d1d1f,#3a3a3c)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{color:"#fff",fontSize:12,fontWeight:700}}>C</span>
            </div>
            <span style={{fontSize:15,fontWeight:700,letterSpacing:"-0.3px",whiteSpace:"nowrap"}}>
              CHABE <span style={{color:"#86868b",fontWeight:500}}>Dubai</span>
            </span>
          </div>
          <div style={{display:"flex",gap:2,background:"rgba(0,0,0,0.05)",borderRadius:10,padding:3}}>
            {tabs.map(t=>(
              <button key={t.id} onClick={()=>setView(t.id)} style={{background:view===t.id?"#fff":"transparent",border:"none",borderRadius:8,padding:"5px 14px",fontSize:13,fontWeight:view===t.id?600:400,color:view===t.id?"#1d1d1f":"#86868b",cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",boxShadow:view===t.id?"0 1px 4px rgba(0,0,0,0.1)":"none",whiteSpace:"nowrap"}}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="hide-mobile" style={{fontSize:11,color:"#86868b",fontWeight:500,background:"rgba(0,0,0,0.04)",padding:"5px 10px",borderRadius:20,whiteSpace:"nowrap"}}>Fév 2026</div>
        </div>
      </nav>
      <UploadBar/>
      <div key={view} className="main" style={{maxWidth:1200,margin:"0 auto",padding:"24px 32px 60px"}}>
        {view==="daily"   && <DailyView/>}
        {view==="monthly" && <MonthlyView/>}
        {view==="annual"  && <AnnualView/>}
        {view==="fleet"   && <FleetView/>}
        {view==="checkin" && <CheckInView/>}
      </div>
    </div>
  );
}
