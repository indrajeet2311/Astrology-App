import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const bundle = await build({
  stdin: {
    contents: "export * from './src/ask/core'; export * from './src/ask/assess'; export * from './src/ask/engine'; export { compoundRelations } from './src/vargas'; export { arudhaPadas, charaKarakas } from './src/jaimini';",
    resolveDir: root,
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const rules = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const planetNames = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const chart = {
  ascendant: { signNumber: 1, divisionalSigns: { D9: 1 } },
  planets: planetNames.map((name, index) => ({
    name, signNumber: 1, sign: signs[0], house: 1,
    longitude: index + 1, degreeInSign: index + 1,
    navamsaSignNumber: 1, divisionalSigns: { D9: 1 },
    dignity: null, combust: false, retrograde: false,
  })),
  birthDetails: { date: '1988-06-14' }, yogas: [], aspects: [],
  dashas: [], yoginiDashas: [], charaDashas: [], transits: { sadeSati: { active: false } },
};
const ctx = {
  chart, today: '2026-10-05', strength: {}, relations: rules.compoundRelations(chart),
  padas: rules.arudhaPadas(chart), karakas: rules.charaKarakas(chart), jaimini: [], transits: null,
};
for (let ascendant = 1; ascendant <= 12; ascendant++) {
  const rotated = { ...ctx, chart: { ...chart, ascendant: { signNumber: ascendant } } };
  const owned = planetNames.slice(0, 7).flatMap((name) => rules.housesRuledBy(rotated, name));
  assert.equal(new Set(owned).size, 12);
}

for (const [division, house] of [['D9', 7], ['D10', 10], ['D4', 4], ['D20', 9], ['D30', 1]]) {
  const controlled = JSON.parse(JSON.stringify(ctx));
  controlled.chart.ascendant.divisionalSigns[division] = 1;
  const sourceHouse = ((house - 7 + 12) % 12) + 1;
  for (const position of controlled.chart.planets) position.divisionalSigns[division] = sourceHouse;
  const assessment = rules.assessVarga(controlled, division, house, null, division);
  for (const name of planetNames.slice(0, 7)) {
    assert(assessment.evidence.some((item) => item.text.includes(`${name} aspects the ${rules.ordinal(house)} house by its 7th aspect`)));
  }
  assert(!assessment.evidence.some((item) => /(?:Rahu|Ketu) aspects/.test(item.text)));
}
assert(rules.placementComfort(12, 'Own', false).includes('strength and ease are not the same'));
const influences = JSON.parse(JSON.stringify(ctx));
const setVarga = (name, sign) => { influences.chart.planets.find((position) => position.name === name).divisionalSigns.D9 = sign; };
for (const name of planetNames) setVarga(name, 1);
setVarga('Rahu', 7);
setVarga('Venus', 7);
const strongHost = rules.assessNode(influences, 'Rahu', 'D9');
assert(strongHost.evidence.some((item) => item.text.includes('Venus (sign lord and conjunction partner, in its own sign')));
setVarga('Venus', 6);
const weakHost = rules.assessNode(influences, 'Rahu', 'D9');
assert(strongHost.score > weakHost.score, 'Node assessment must respond to dispositor dignity and conjunction');
for (const node of ['Rahu', 'Ketu']) {
  setVarga(node, 7);
  const weak = rules.assessNode(influences, node, 'D9').score;
  setVarga('Venus', 7);
  assert(rules.assessNode(influences, node, 'D9').score > weak, `${node}: conditional hosts`);
  setVarga('Venus', 6);
}
setVarga('Jupiter', 4);
setVarga('Moon', 8);
setVarga('Mercury', 8);
const moonSupport = rules.assessPlanetInfluences(influences, 'Moon', 'D9');
assert(moonSupport.evidence.some((item) => item.text.includes('Jupiter aspects Moon by its 5th aspect') && item.text.includes('exalted') && item.text.includes('mitigates the receiver')));
const occupiedHouse = rules.assessVarga(influences, 'D9', 8, null, 'Navamsa');
assert(occupiedHouse.evidence.some((item) => item.text.includes('Jupiter aspects Moon')));
assert(occupiedHouse.evidence.some((item) => item.text.includes('Jupiter aspects Mercury')));
setVarga('Jupiter', 8);
setVarga('Venus', 2);
assert(rules.assessPlanetInfluences(influences, 'Venus', 'D9').evidence.some((item) => item.text.includes('Jupiter') && item.text.includes('mutual aspect')));
setVarga('Venus', 7);
setVarga('Saturn', 10);
const ownSaturn = rules.assessPlanetInfluences(influences, 'Venus', 'D9');
setVarga('Saturn', 1);
const weakSaturn = rules.assessPlanetInfluences(influences, 'Venus', 'D9');
assert(ownSaturn.score > weakSaturn.score, 'Aspecting planet dignity must affect influence strength');
setVarga('Rahu', 4);
setVarga('Moon', 8);
setVarga('Jupiter', 10);
const withoutCompanion = rules.assessNode(influences, 'Rahu', 'D9');
setVarga('Jupiter', 4);
const withCompanion = rules.assessNode(influences, 'Rahu', 'D9');
assert(withCompanion.score > withoutCompanion.score, 'Node conjunction strength must matter independently of its unchanged sign lord');
assert(withCompanion.evidence[0].text.includes('Jupiter (conjunction partner, exalted'));
const domains = ['marriage', 'relationship', 'career', 'property', 'spiritual', 'health'];
const divisions = ['D9', 'D9', 'D10', 'D4', 'D20', 'D30'];
const primaryHouses = [[7], [5, 7], [10], [4], [9, 12], [1, 6]];
const divisionalHouses = [[7], [7], [10], [4], [9], [1]];
const mutual = JSON.parse(JSON.stringify(ctx));
const mutualMars = mutual.chart.planets.find((position) => position.name === 'Mars');
Object.assign(mutualMars, { signNumber: 10, sign: 'Capricorn', house: 10, dignity: 'EXALTED' });
const mutualSaturn = mutual.chart.planets.find((position) => position.name === 'Saturn');
Object.assign(mutualSaturn, { signNumber: 1, sign: 'Aries', house: 1, dignity: 'DEBILITATED' });
mutual.chart.aspects = [
  { planet: 'Mars', houses: [1, 4, 5], planets: ['Saturn'] },
  { planet: 'Saturn', houses: [3, 7, 10], planets: ['Mars'] },
];
mutual.relations = rules.compoundRelations(mutual.chart);
const mutualReading = rules.houseFactorSummary(mutual, 1);
assert(mutualReading.includes('Saturn aspects Mars by its 10th aspect'));
assert(mutualReading.includes('mutual aspect: Mars returns its 4th aspect to Saturn'));
assert(mutualReading.includes('D1 lord of 10th/11th'));
assert(rules.answerQuestion(mutual, 'How is my health?', 'health').plain.includes(mutualReading));
mutual.chart.aspects[0].houses = [];
const oneWayReading = rules.houseFactorSummary(mutual, 1);
assert(oneWayReading.includes('Saturn aspects Mars by its 10th aspect'));
assert(!oneWayReading.includes('mutual aspect'), 'A one-way aspect must not be described as mutual');
const observedScores = new Map(domains.map((domain) => [domain, new Set()]));
let generatedAnswers = 0;
for (let ascendant = 1; ascendant <= 12; ascendant++) {
  for (let layout = 0; layout < 3; layout++) {
    const generated = JSON.parse(JSON.stringify(ctx));
    generated.chart.ascendant.signNumber = ascendant;
    generated.chart.birthDetails.date = '1988-06-14';
    generated.chart.ascendant.divisionalSigns = Object.fromEntries(
      ['D9', 'D10', 'D4', 'D20', 'D30'].map((division, index) => [division, ((ascendant + layout + index - 1) % 12) + 1]),
    );
    generated.chart.planets.forEach((position, index) => {
      position.signNumber = ((ascendant + index * 3 + layout * 2 - 1) % 12) + 1;
      position.sign = signs[position.signNumber - 1];
      position.house = ((position.signNumber - ascendant + 12) % 12) + 1;
      position.longitude = (position.signNumber - 1) * 30 + index + 1;
      position.dignity = null;
      position.divisionalSigns = Object.fromEntries(
        ['D9', 'D10', 'D4', 'D20', 'D30'].map((division, offset) => [division, ((ascendant + index * 5 + layout + offset * 2 - 1) % 12) + 1]),
      );
      position.navamsaSignNumber = position.divisionalSigns.D9;
    });
    generated.chart.aspects = generated.chart.planets.filter((position) => !['Rahu', 'Ketu'].includes(position.name)).map((position) => {
      const reaches = position.name === 'Mars' ? [4, 7, 8] : position.name === 'Jupiter' ? [5, 7, 9] : position.name === 'Saturn' ? [3, 7, 10] : [7];
      return { planet: position.name, houses: reaches.map((distance) => ((position.house + distance - 2) % 12) + 1), planets: [] };
    });
    generated.relations = rules.compoundRelations(generated.chart);
    generated.padas = rules.arudhaPadas(generated.chart);
    generated.karakas = rules.charaKarakas(generated.chart);
    domains.forEach((domain, index) => {
      const result = rules.answerQuestion(generated, 'How is the outlook?', domain);
      assert(Number.isFinite(result.score) && result.score >= 5 && result.score <= 95, `${domain}: score`);
      assert(result.plain.some((text) => text.startsWith(`Integrated ${result.domainLabel.toLowerCase()} assessment:`)), `${domain}: common synthesis`);
      for (const house of primaryHouses[index]) {
        const summary = rules.houseFactorSummary(generated, house);
        assert(result.plain.includes(summary), `${domain}: mandatory D1 house and lord reading`);
        for (const name of rules.occupants(generated, house)) assert(summary.includes(`${name} (`), `${domain}: occupant identity`);
        const lord = rules.lordOfHouse(generated, house);
        for (const name of rules.aspectors(generated, rules.planet(generated, lord).house).filter((source) => source !== lord)) {
          assert(summary.includes(`${name} aspects ${lord} by its`), `${domain}: every aspect to the lord retained`);
        }
        for (const name of rules.aspectors(generated, house)) {
          assert(rules.assessHouse(generated, house, null).evidence.some((item) => item.text.includes(`${name} aspects the ${rules.ordinal(house)} house by`)), `${domain}: every house aspect recorded`);
        }
      }
      for (const house of divisionalHouses[index]) assert(result.plain.some((text) => text.includes(rules.houseFactorSummary(generated, house, divisions[index]))), `${domain}: mandatory divisional house and lord reading`);
      assert.equal(result.plain.filter((text) => text.includes(`${divisions[index]}):`)).length, 1, `${domain}: one divisional summary`);
      assert(!result.plain.some((text) => text.startsWith('Overall ') || text.includes('D1-to-D9 check:')), `${domain}: no repeated chart-wide recap`);
      assert.equal(new Set(result.technical).size, result.technical.length, `${domain}: unique reasoning`);
      assert(result.technical.some((text) => text.includes(`(${divisions[index]})`)), `${domain}: divisional chart`);
      observedScores.get(domain).add(result.score);
      generatedAnswers++;
    });
  }
}
for (const [domain, scores] of observedScores) assert(scores.size > 1, `${domain}: assessment must respond to chart changes`);
const timing = JSON.parse(JSON.stringify(ctx));
const period = (main, sub, start, end) => ({
  lord: main, start, end, pratyantardashas: [],
  antardashas: [{ lord: sub, start, end, pratyantardashas: [] }],
});
const significators = new Map([['Venus', { weight: 10, reasons: ['natural significator'] }]]);
timing.chart.dashas = [period('Sun', 'Venus', '2027-01-01', '2027-04-01')];
let windows = rules.scoreWindows(timing, significators, '2027-01-01', '2028-01-01', 'D9', [7]);
assert(windows.some((window) => window.system === 'Vimshottari' && window.md === 'Sun' && window.ad === 'Venus'));
assert(windows[0].reasons.some((reason) => reason.includes('main lord has limited direct topic relevance')));

timing.chart.charaDashas = [period('Libra', 'Libra', '2027-01-01', '2027-04-01')];
windows = rules.scoreWindows(timing, significators, '2027-01-01', '2028-01-01', 'D9', [7]);
assert(windows.some((window) => window.system === 'Chara' && window.reasons.some((reason) => reason.includes('7th from DK'))));
timing.chart.charaDashas = [period('Capricorn', 'Capricorn', '2027-01-01', '2027-04-01')];
windows = rules.scoreWindows(timing, significators, '2027-01-01', '2028-01-01', 'D10', [10]);
assert(windows.some((window) => window.system === 'Chara' && window.reasons.some((reason) => reason.includes('10th from AmK'))));

timing.chart.dashas = [period('Venus', 'Venus', '2027-01-01', '2027-04-01')];
timing.chart.yoginiDashas = [period('Siddha', 'Siddha', '2027-01-01', '2027-02-15')];
timing.chart.charaDashas = [period('Libra', 'Libra', '2027-03-01', '2027-04-01')];
windows = rules.scoreWindows(timing, significators, '2027-01-01', '2028-01-01', 'D9', [7]);
assert.equal(windows.find((window) => window.system === 'Vimshottari').confluence, 2, 'Disjoint overlaps must not imply three-way agreement');
timing.chart.charaDashas = [period('Libra', 'Libra', '2027-01-01', '2027-02-15')];
windows = rules.scoreWindows(timing, significators, '2027-01-01', '2028-01-01', 'D9', [7]);
assert(windows.some((window) => window.convergence.some((interval) => interval.systems.length === 3 && interval.start === '2027-01-01' && interval.end === '2027-02-15')));
const timingAnswer = rules.answerQuestion(timing, 'When will a relationship come?', 'relationship');
const natureAnswer = rules.answerQuestion(timing, 'How will my marriage be?', 'marriage');
assert.equal(natureAnswer.headline, '', 'Nature guidance must not repeat in the headline');
assert(natureAnswer.nature.length > 0, 'Nature guidance remains available');
assert(!natureAnswer.plain.some((text) => text.startsWith('The currently active') || text.startsWith('The nearest')), 'Nature reading must not repeat timing summaries');
const selected = timingAnswer.groups[0].windows;
for (const system of ['Vimshottari', 'Yogini', 'Chara']) assert(selected.some((window) => window.system === system), `${system}: representation`);
for (const window of selected) assert(window.relative * 100 <= timingAnswer.score + 0.0001, 'Timing label must respect natal support');
assert(selected.every((window) => !window.plain.includes('probability of')));
console.log(`Ask assessment regressions passed: ${generatedAnswers} generated answers across 12 Ascendants and six topics, plus generic divisional-house checks.`);
console.log('Three-dasha timing passed: planetary AD activation, DK/AmK derived houses, dated confluence, system representation and natal-limited labels.');
console.log('Influence and repetition checks passed: node hosts, independent conjunctions, source dignity, mutual aspects, debility mitigation and concise summaries.');
console.log('House/lord coverage passed: all primary houses and divisional houses, occupant lordships, incoming lord aspects and true versus one-way mutual links.');