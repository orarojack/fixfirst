/*
 * FixFirst · data.js
 * Categories, departments, labelled training sentences, urgency signals
 * and demo reports.
 *
 * To adapt FixFirst to YOUR community:
 *   1. Rename the departments to the real offices that handle each problem.
 *   2. Add training sentences written the way people around you talk.
 *   3. Replace the demo reports with real places from your area.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FixFirstData = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ➜ CHANGE THESE FOR YOUR COMMUNITY. Everyone who opens your link sees this name and map.
  //   To get coordinates: open Google Maps or openstreetmap.org, right-click your community's
  //   centre and copy the two numbers (latitude, longitude).
  const COMMUNITY = {
    name: "Riverside",
    center: [30.2672, -97.7431], // placeholder location (Austin, Texas); replace with yours
    zoom: 15
  };

  // base = how risky this kind of problem is before reading any details (0-10 scale)
  const CATEGORIES = [
    { id: "roads", name: "Roads & transport", dept: "Public Works, Roads Division", base: 1.5 },
    { id: "water", name: "Water & sewage", dept: "Water & Sanitation Utility", base: 2 },
    { id: "waste", name: "Waste & litter", dept: "Waste Management Services", base: 1 },
    { id: "power", name: "Power & streetlights", dept: "Electricity & Street Lighting Unit", base: 2 },
    { id: "drainage", name: "Drainage & flooding", dept: "Stormwater & Drainage Office", base: 1.5 },
    { id: "safety", name: "Public safety", dept: "Community Safety Office", base: 2 },
    { id: "parks", name: "Parks & public spaces", dept: "Parks & Recreation Department", base: 0.5 }
  ];

  // One labelled example per line: category_id|sentence
  const TRAINING_TEXT = `
roads|Huge pothole in the middle of the road and cars swerve to avoid it
roads|The tarmac on our street is cracked and crumbling after the rains
roads|Deep potholes near the junction are damaging car tires
roads|Traffic lights at the main intersection are not working
roads|Road sign knocked down at the roundabout so drivers go the wrong way
roads|The sidewalk is broken and uneven and people trip on it
roads|There is no pedestrian crossing outside the market on a very busy road
roads|Bus stop shelter roof is damaged and the bench is broken
roads|Gravel road is full of deep ruts and minibuses can no longer pass
roads|Road markings have completely faded on the highway exit
roads|Traffic jams every morning because the junction has no signals
roads|Cars speed down the school road and we need speed bumps
roads|Potholes full of water on the main road splash pedestrians
roads|Missing stop sign at the crossroads causes near accidents every day
roads|Road works were left unfinished with gravel piles and no warning signs
roads|Motorbike riders keep falling because the street is so bumpy
roads|An abandoned car has been blocking the lane for a month
roads|The access road to the village is too damaged for buses
roads|Speed bumps are unpainted and drivers hit them at full speed
roads|Cracked asphalt and loose stones on the hill road
roads|Lane markings at the roundabout are confusing for drivers
roads|Cars parked on both sides block the road and ambulances cannot pass
roads|Massive potholes on the road to the hospital make the drive dangerous
roads|The road surface is breaking up and full of potholes
roads|Our road has never been repaired and the potholes keep getting bigger
roads|The traffic signal at the crossing is broken and cars do not stop
roads|Pedestrians have no sidewalk and must walk on the road
roads|The bridge on the main road has cracks and potholes
roads|Vehicles get stuck on the muddy road every rainy season
roads|The speed limit sign near the school is missing
roads|The bus stop has no shelter and the road there is full of holes
roads|We need a pedestrian bridge or crossing on the highway
roads|Traffic congestion at the junction because of a broken signal
roads|The road needs resurfacing because the asphalt is worn out
water|Burst water pipe leaking clean water onto the road
water|No water in our taps for five days
water|Water from the tap is brown and smells bad
water|Sewage overflowing from a sewer onto the street
water|Public toilet is blocked and sewage is leaking out
water|The water meter is leaking and wasting water all night
water|Very low water pressure and only a trickle comes out in the morning
water|The communal tap is broken and people queue for hours
water|Raw sewage flowing into the stream behind the houses
water|Construction crew damaged the main water line and the whole estate has no water
water|Septic tank overflowing near the homes with a terrible smell
water|The water tank at the school is cracked and leaking
water|Drinking water is contaminated and people are getting stomach problems
water|A leaking pipe has wasted thousands of liters of water
water|The borehole pump is broken so the community has no clean water
water|Sewer line blocked and toilets are backing up in the apartments
water|Water supply schedule is not followed and we have had no supply for a week
water|Pipe joint leaking at the bottom of the hill with water running down the street
water|Public toilets have no running water and are filthy
water|Smell of sewage near the market from a broken sewer pipe
water|Dirty water coming out of the pipes after the repairs
water|Leaking water main is soaking the sidewalk
water|Water pipe burst and water is gushing out
water|Our taps have been dry since Monday
water|The water smells of chlorine and looks cloudy
water|Sewer manhole overflowing with sewage after the rain
water|Leaking water pipe under the road
water|We have no running water in the estate
water|The public water kiosk has run dry
water|Broken sewer pipe is leaking sewage into the yard
water|Low water pressure in the upper floors
water|The water supply is cut off every weekend
water|Tap water tastes salty and dirty
water|Pipes leaking at the water point near the market
waste|Garbage has not been collected for two weeks
waste|Bins are overflowing and trash is spilling onto the street
waste|People are dumping rubbish illegally on the empty plot
waste|Trash is being burned in the open and there is thick smoke everywhere
waste|Litter and plastic bags all over the market area
waste|Rats and flies around the uncollected garbage pile
waste|The dumpsite next to the houses grows bigger every day
waste|The garbage truck skipped our street again this week
waste|Construction waste dumped on the roadside
waste|Plastic bottles and wrappers littering the school compound
waste|No waste bins at the bus station so people throw litter on the ground
waste|Rotting food waste behind the restaurant smells terrible
waste|Overflowing dumpster at the estate entrance is attracting flies and crows
waste|Medical waste dumped near the clinic with syringes on the ground
waste|Old mattresses and furniture dumped in the alley
waste|The collection point is full and nobody has emptied it
waste|A trash heap is blocking the footpath and smells awful
waste|Residents burn plastic waste at night and the smoke is choking
waste|Recycling bins have not been emptied for a month
waste|The riverbank is covered in litter and rubbish
waste|Garbage bags torn open by animals and scattered across the road
waste|Waste collection only happens once a month in our neighborhood
waste|Garbage piling up on the corner of our street
waste|The rubbish bins have not been emptied for days
waste|Illegal dumping of garbage near the stream
waste|Trash collectors have not come in three weeks
waste|Plastic waste and litter everywhere in the neighborhood
waste|Overflowing garbage skip at the market
waste|Burning garbage at the dumpsite fills the air with smoke
waste|Uncollected trash bags are piling up outside the apartments
waste|Litter thrown from cars along the highway
waste|We need more waste bins in the town center
waste|A dead animal is rotting by the roadside
waste|Garbage bins are broken and the waste is scattered
power|Streetlight not working and the whole street is dark at night
power|Power outage in our area since yesterday
power|Exposed electric wire hanging low from the pole
power|The transformer is sparking and making loud bangs
power|Streetlights along the road have been off for weeks
power|Power line fell across the footpath after the storm
power|An electric pole is leaning dangerously over the houses
power|Frequent blackouts every evening in the estate
power|Street lamp flickering on and off all night
power|Broken light bulbs in the underpass leave it pitch dark
power|Electricity meter box is open with live wires showing
power|Security lights at the market are broken
power|Voltage fluctuations are damaging appliances in our homes
power|No electricity at the health center for three days
power|Solar street lights stopped working after a month
power|Cables tangled on the pole spark when it rains
power|Power keeps cutting off every afternoon
power|The road is dark at night because all the lamps are broken
power|Illegal electricity connections with wires running across the street
power|A car knocked down a streetlight pole on the main road
power|Electric cables lying on the ground near homes
power|Our transformer blew and the neighborhood has had no power since Monday
power|Streetlights are broken on our street
power|The street lamp at the corner has not worked for a month
power|Electricity has been off since last night
power|Low hanging power cables near the shops
power|The transformer exploded and the area has no electricity
power|The power supply keeps going off and on
power|Broken streetlight near the bus stop makes the area dark
power|Electric wires touching the tree branches and sparking
power|Faulty streetlights stay on during the day and off at night
power|Power cut in the whole neighborhood
power|Damaged electricity pole after a truck hit it
power|Exposed wiring at the base of the light pole
drainage|Drain blocked with plastic bottles and the road floods when it rains
drainage|The road floods every time it rains heavily
drainage|Stagnant water in the ditch is breeding mosquitoes
drainage|The storm drain is clogged with mud and silt
drainage|Houses flooded after the rain because the drainage channel is blocked
drainage|The culvert under the road is blocked and water overflows
drainage|Flash floods wash away soil near the homes
drainage|Rainwater collects at the school gate and children cannot pass
drainage|Gutters along the street are full of silt
drainage|Rainwater flows into shops because there is no drainage
drainage|The footpath floods after every storm
drainage|The drainage ditch caved in and water is eroding the road
drainage|Puddles of standing water remain for days after rain
drainage|The river overflows its banks during the rains and floods the market
drainage|The open drain is blocked and smells
drainage|Runoff is carving deep gullies near the houses
drainage|The drainage pipe under the estate road is too small and keeps overflowing
drainage|Mosquitoes everywhere because of pools of stagnant water
drainage|The lower part of the village floods after heavy rain
drainage|Blocked gutters make water pour into the classrooms
drainage|Water pools at the bus stop whenever it rains
drainage|Storm water drains are covered with soil and grass
drainage|Blocked drainage causes flooding on our street
drainage|The drains are clogged and rainwater floods the houses
drainage|Heavy rain floods the junction because the drains are blocked
drainage|Stagnant water around the market after the rains
drainage|The drainage canal is full of garbage and overflowing
drainage|Our compound floods whenever it rains
drainage|Storm drains need cleaning before the rainy season
drainage|Water from the hill floods the road every rainy season
drainage|Clogged gutter overflowing onto the sidewalk
drainage|Floodwater is standing in the street
drainage|The drainage channel collapsed and water spills onto homes
drainage|Rainwater pools in front of the clinic
safety|Open manhole with no cover and someone could fall in
safety|An abandoned building is collapsing and kids play inside
safety|A fallen tree is blocking the footpath after the storm
safety|The railing on the footbridge is broken and very dangerous
safety|Stray dogs are chasing and biting people near the market
safety|The wall around the school is cracked and about to fall
safety|People are being robbed in the alley behind the shops
safety|Large hole at the construction site with no fence around it
safety|Loose rocks are falling from the hillside onto the walkway
safety|A dead tree is leaning over the road and could fall any time
safety|Broken glass and sharp metal scattered on the walkway
safety|People are harassed at the bus stop at night and there is no security
safety|An uncovered well near the houses is a danger to children
safety|Scaffolding is falling off the building under construction onto the street
safety|The footbridge over the river is rotting and shaking
safety|Unfenced quarry pit filled with water where children swim
safety|The staircase in the public housing block is crumbling
safety|No security guard at the market and thefts are increasing
safety|A rabid dog was seen roaming near the primary school
safety|Broken fence around the deep pond lets children wander in
safety|Missing manhole cover on the sidewalk is a death trap
safety|Uncovered trench on the walkway with no warning tape
safety|Open manhole on the street is a danger to pedestrians
safety|The manhole cover was stolen and the hole is left open
safety|Stray dogs roam the estate at night and attack people
safety|A tree has fallen across the road after the storm
safety|Old building with cracked walls is about to collapse
safety|Broken fence around the construction site lets kids enter
safety|Deep open trench left by contractors with no barrier
safety|Insecurity at the bus stop at night and people are attacked
safety|Rocks falling from the cliff onto the path
safety|The rusty footbridge railing is falling apart
safety|Dangerous hole in the ground near the school
safety|A collapsed wall is blocking the path and could fall further
parks|The swings in the playground are broken
parks|Grass in the park is overgrown and full of weeds
parks|Benches in the public garden have been vandalized
parks|Graffiti all over the community hall walls
parks|The playground slide is rusty with sharp edges
parks|The football pitch is muddy and the goalposts are broken
parks|The community park has no lights or seating
parks|The library garden is neglected and untidy
parks|The children's play area has broken equipment
parks|Trees in the park need trimming because branches hang low
parks|The basketball court surface is cracked and the hoops are missing
parks|The fountain in the town square is broken and full of algae
parks|Picnic tables in the park are rotting
parks|There is no shade or benches at the public square
parks|The sports ground gates are always locked so youths have nowhere to play
parks|The community hall roof leaks and the chairs are broken
parks|The walking trail in the park is overgrown and the signs are missing
parks|Outdoor gym equipment in the park is broken
parks|The memorial garden flowers were destroyed and the fence vandalized
parks|The open field used for events is full of weeds and holes
parks|The skate park ramps are cracked and splintered
parks|The public garden fence is broken and goats are eating the plants
parks|The park is dirty and the benches are broken
parks|The playground equipment is old and broken
parks|Grass and weeds are overgrown in the public park
parks|Vandalism in the park damaged the benches and signs
parks|The children's playground needs new swings
parks|The football field has no grass and broken goalposts
parks|The community garden is neglected
parks|Graffiti on the park walls and benches
parks|The sports field needs maintenance
parks|Park trees need pruning and the hedges are overgrown
parks|The public square needs more benches and shade trees
parks|The basketball court in the park is damaged
`;

  const TRAINING = TRAINING_TEXT.trim().split("\n").map(function (line) {
    const i = line.indexOf("|");
    return { label: line.slice(0, i).trim(), text: line.slice(i + 1).trim() };
  });

  // Risk signals the urgency scorer looks for. Each one adds `w` points (score is capped at 10)
  // and `why` is shown to the user so every point is explained.
  const URGENCY_SIGNALS = [
    { w: 4, why: "exposed live wires", re: /\belectrocut\w*|\blive wires?\b|\bexposed (electric(al)? )?(wires?|cables?)\b|\b(power|electric(al)?) (lines?|cables?|wires?) (fell|fallen|down|lying|hanging)|\bwires? (hanging|lying|showing)\b/i },
    { w: 3, why: "sparking", re: /\bspark(s|ing|ed)?\b/i },
    { w: 3, why: "fire or explosion risk", re: /\bfire\b|\bflames?\b|\bexplo(de|ded|sion)\b|\bbangs?\b/i },
    { w: 4, why: "gas leak", re: /\bgas leak/i },
    { w: 3, why: "risk of collapse", re: /\bcollaps\w*|\babout to (fall|collapse)\b|\bcould fall\b|\bready to fall\b|\bcaved? in\b/i },
    { w: 3, why: "someone was hurt", re: /\binjur\w*|\bhurt\b|\bbit(ten|ing)\b|\bbleed\w*|\bwounded\b|\bkilled\b|\bdied\b/i },
    { w: 3, why: "accidents happening", re: /\baccidents?\b|\bcrash\w*|\bnear miss/i },
    { w: 4, why: "drowning risk", re: /\bdrown\w*/i },
    { w: 3, why: "open pit or manhole", re: /\bopen manholes?\b|\bno cover\b|\bmissing (manhole )?covers?\b|\buncovered\b|\bunfenced\b/i },
    { w: 2, why: "sewage exposure", re: /\bsewage\b|\bsewer\b|\braw waste\b/i },
    { w: 3, why: "health risk", re: /\bcontaminat\w*|\bstomach\b|\bdiarrh\w*|\bcholera\b|\btyphoid\b|\bsick\b/i },
    { w: 2, why: "children affected", re: /\b(child|children|kids?|pupils?|students?|schools?|classrooms?|playground)\b/i },
    { w: 2, why: "vulnerable people affected", re: /\belderly\b|\bdisabled\b|\bwheelchairs?\b|\bpregnant\b|\bblind\b/i },
    { w: 2, why: "health services affected", re: /\bhospitals?\b|\bclinics?\b|\bhealth (center|centre)\b|\bambulances?\b/i },
    { w: 2, why: "described as dangerous", re: /\bdanger\w*|\bunsafe\b|\bhazard\w*|\bdeadly\b|\bdeath trap\b/i },
    { w: 2, why: "essential service cut off", re: /\bno (running |clean )?water\b|\bwithout water\b|\bno (water )?supply\b|\bno electricity\b|\bno power\b/i },
    { w: 2, why: "water entering buildings", re: /\b(homes?|houses?|shops?|classrooms?) (are |were |got )?flood\w*|\b(flood\w*|flow\w*|pour\w*) into (the )?(homes?|houses?|shops?|classrooms?)\b/i },
    { w: 1, why: "sharp or rusty parts", re: /\bsharp\b|\bbroken glass\b|\brusty\b/i },
    { w: 1, why: "water being wasted", re: /\bburst\b|\bwast(ing|ed) water\b|\bthousands of (liters|litres)\b/i },
    { w: 1, why: "dark at night", re: /\bdark\b|\bunlit\b|\bpitch black\b/i },
    { w: 1, why: "traffic risk", re: /\bswerv\w*|\bwrong way\b|\boncoming\b|\bspeeding\b/i },
    { w: 1, why: "disease carriers", re: /\bmosquito\w*|\brats?\b|\bflies\b|\bpests?\b|\bcockroach\w*/i },
    { w: 1, why: "smoke or burning", re: /\bsmoke\b|\bburn(s|ing|ed|t)?\b|\bfumes\b/i },
    { w: 1, why: "going on for a long time", re: /\b(\d+|two|three|four|five|six|seven|eight|nine|ten|several|many) (days|weeks|months)\b|\bfor (days|weeks|months)\b|\bfor a (week|month)\b|\bsince (last|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i },
    { w: 1, why: "keeps happening", re: /\bagain\b|\bstill\b|\bevery (time|day|morning|evening|night|week)\b|\bkeeps?\b|\balways\b|\brepeatedly\b/i },
    { w: 1, why: "affects many people", re: /\bwhole\b|\bentire\b|\beveryone\b|\beverywhere\b|\bhundreds\b|\ball the (houses|homes|shops|residents)\b/i },
    { w: 1, why: "large in scale", re: /\bdeep\b|\bhuge\b|\bmassive\b|\benormous\b/i }
  ];

  // Urgency levels, highest first.
  const LEVELS = [
    { id: "critical", name: "Critical", min: 8.5 },
    { id: "high", name: "High", min: 6 },
    { id: "moderate", name: "Moderate", min: 3.5 },
    { id: "low", name: "Low", min: 0 }
  ];

  // Demo reports so the board and map aren't empty the first time someone opens the app.
  // at: [metres east, metres north] of the community centre, so demo pins follow your map.
  const DEMO_REPORTS = [
    { category: "roads", daysAgo: 6, at: [120, 30], confirmations: 7, status: "open", location: "Main Street, Central Market",
      text: "Deep pothole on Main Street right by the Central Market entrance. Cars swerve into the other lane to avoid it." },
    { category: "power", daysAgo: 14, at: [-430, 380], confirmations: 12, status: "open", location: "Hospital Road",
      text: "Streetlights along Hospital Road have been out for two weeks. The road is completely dark at night and people walking to the clinic feel unsafe." },
    { category: "waste", daysAgo: 10, at: [520, -360], confirmations: 9, status: "in_progress", location: "Block C Apartments",
      text: "Garbage at Block C apartments has not been collected for 10 days. The bins are overflowing and there are rats everywhere." },
    { category: "water", daysAgo: 3, at: [-260, -310], confirmations: 4, status: "open", location: "Church Road",
      text: "Burst water pipe on Church Road has been leaking clean water for three days and the road is turning to mud." },
    { category: "drainage", daysAgo: 21, at: [340, 270], confirmations: 15, status: "open", location: "Bus Station",
      text: "The drain beside the bus station is blocked with plastic bottles. Every time it rains the whole station floods and people wade through dirty water." },
    { category: "parks", daysAgo: 8, at: [-540, -90], confirmations: 5, status: "open", location: "Community Park",
      text: "The slide at the Community Park playground is rusty with sharp broken edges. A child was injured on it last week." },
    { category: "safety", daysAgo: 4, at: [660, 110], confirmations: 8, status: "open", location: "Football Ground",
      text: "Open manhole with no cover at the Football Ground entrance. Very dangerous at night, someone will fall in." },
    { category: "water", daysAgo: 5, at: [175, 70], confirmations: 6, status: "open", location: "Central Market",
      text: "Public toilets at the Central Market have no running water and sewage is leaking onto the walkway." },
    { category: "waste", daysAgo: 2, at: [-130, 520], confirmations: 3, status: "open", location: "Library, School Lane",
      text: "People keep dumping trash behind the library and burning it. The smoke drifts into the classrooms next door." },
    { category: "roads", daysAgo: 1, at: [-40, 15], confirmations: 2, status: "resolved", location: "Main Street & 3rd Avenue",
      text: "Traffic light at the junction of Main Street and 3rd Avenue is stuck on red, causing long queues." },
    { category: "safety", daysAgo: 0, at: [210, -620], confirmations: 1, status: "open", location: "River Lane",
      text: "A fallen tree branch is blocking the footpath on River Lane after last night's storm." },
    { category: "drainage", daysAgo: 12, at: [545, -330], confirmations: 4, status: "resolved", location: "Block C Apartments",
      text: "Stagnant water in the ditch behind Block C is breeding mosquitoes." }
  ];

  // One-click examples on the report form (handy for demos).
  const EXAMPLES = [
    { label: "Broken water point", location: "Hilltop Road", at: [-700, 640],
      text: "The public water point on Hilltop Road has been broken for a week. Families have no clean water and walk far to fetch it." },
    { label: "Pothole at the market", location: "Main Street, Central Market", at: [135, 38],
      text: "Huge pothole near the Central Market on Main Street, cars keep swerving into the other lane." },
    { label: "Sparking wires", location: "Riverside Primary School gate", at: [-620, 240],
      text: "Exposed electric wires are hanging low near the Riverside Primary School gate and sparking when it rains. Kids walk past every morning." },
    { label: "Flooded road", location: "Block C Apartments", at: [495, -395],
      text: "The road outside Block C floods every time it rains because the drain is blocked with plastic." }
  ];

  return { COMMUNITY, CATEGORIES, TRAINING, URGENCY_SIGNALS, LEVELS, DEMO_REPORTS, EXAMPLES };
});
