import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const bundle = await build({
  stdin: {
    contents: "export * from './src/ask/core'; export * from './src/ask/assess'; export * from './src/ask/engine'; export * from './src/ask/bookRules'; export { HOUSE_THEME } from './src/ask/answers'; export { compoundRelations } from './src/vargas'; export { arudhaPadas, charaKarakas } from './src/jaimini';",
    resolveDir: root,
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const rules = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const planetNames = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const allDivisions = Object.fromEntries(['D7', 'D9', 'D10', 'D4', 'D20', 'D30'].map((division) => [division, 1]));
const chart = {
  ascendant: { signNumber: 1, longitude: 0, divisionalSigns: { ...allDivisions } },
  planets: planetNames.map((name, index) => ({
    name, signNumber: 1, sign: signs[0], house: 1,
    longitude: index + 1, degreeInSign: index + 1,
    navamsaSignNumber: 1, divisionalSigns: { ...allDivisions },
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
const domains = ['marriage', 'relationship', 'children', 'career', 'property', 'spiritual', 'health'];
const divisions = ['D9', 'D9', 'D7', 'D10', 'D4', 'D20', 'D30'];
const primaryHouses = [[7], [5, 7], [5], [10], [4], [9, 12], [1, 6]];
const divisionalHouses = [[1, 2, 7], [7], [1, 5, 7], [1, 10], [4], [9], [1]];
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
assert(rules.answerQuestion(mutual, 'How is my health?', 'health').technical.includes(mutualReading));
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
      ['D7', 'D9', 'D10', 'D4', 'D20', 'D30'].map((division, index) => [division, ((ascendant + layout + index - 1) % 12) + 1]),
    );
    generated.chart.planets.forEach((position, index) => {
      position.signNumber = ((ascendant + index * 3 + layout * 2 - 1) % 12) + 1;
      position.sign = signs[position.signNumber - 1];
      position.house = ((position.signNumber - ascendant + 12) % 12) + 1;
      position.longitude = (position.signNumber - 1) * 30 + index + 1;
      position.dignity = null;
      position.divisionalSigns = Object.fromEntries(
        ['D7', 'D9', 'D10', 'D4', 'D20', 'D30'].map((division, offset) => [division, ((ascendant + index * 5 + layout + offset * 2 - 1) % 12) + 1]),
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
      assert(result.plain.some((text) => text.startsWith(`In short, for ${result.domainLabel.toLowerCase()}:`)), `${domain}: common synthesis`);
      for (const house of primaryHouses[index]) {
        const summary = rules.houseFactorSummary(generated, house);
        assert(result.technical.includes(summary), `${domain}: mandatory D1 house and lord reading`);
        assert(result.plain.some((text) => text.includes(rules.housePlainNote(generated, house, undefined, rules.HOUSE_THEME[house]))), `${domain}: plain-language house reading`);
        for (const name of rules.occupants(generated, house)) assert(summary.includes(`${name} (`), `${domain}: occupant identity`);
        const lord = rules.lordOfHouse(generated, house);
        for (const name of rules.aspectors(generated, rules.planet(generated, lord).house).filter((source) => source !== lord)) {
          assert(summary.includes(`${name} aspects ${lord} by its`), `${domain}: every aspect to the lord retained`);
        }
        for (const name of rules.aspectors(generated, house)) {
          assert(rules.assessHouse(generated, house, null).evidence.some((item) => item.text.includes(`${name} aspects the ${rules.ordinal(house)} house by`)), `${domain}: every house aspect recorded`);
        }
      }
      for (const house of divisionalHouses[index]) assert(result.plain.some((text) => text.includes(rules.housePlainNote(generated, house, divisions[index], result.domainLabel.toLowerCase()))), `${domain}: mandatory divisional house and lord reading`);
      assert.equal(result.plain.filter((text) => text.includes('(a deeper chart used for')).length, 1, `${domain}: one divisional summary`);
      assert(!result.plain.some((text) => text.startsWith('Overall ') || text.includes('D1-to-D9 check:')), `${domain}: no repeated chart-wide recap`);
      assert.equal(new Set(result.technical).size, result.technical.length, `${domain}: unique reasoning`);
      assert(result.technical.some((text) => text.includes(`(${divisions[index]})`)), `${domain}: divisional chart`);
      const outcomeText = [result.outcome.summary, ...result.outcome.details, ...result.outcome.advice].join(' ');
      assert(!/\b(aspects?|lordships?|lords?|D1|D7|D9|D10|Navamsa|Dasamsa|Shadbala|Vimshottari|Jaimini|Saturn|Jupiter|Venus)\b/i.test(outcomeText), `${domain}: everyday outcomes must not leak technical chart terms`);
      assert(result.outcome.summary.length > 0, `${domain}: a matched conclusion or an explicit insufficient-evidence result`);
      assert(result.outcome.sources.every((source) => source.rule && source.book && source.pdfPages && source.evidence), `${domain}: traceable rules`);
      const evaluated = rules.evaluateBookFindings(generated, domain);
      for (const id of [...result.outcome.summaryFindingIds, ...result.outcome.cards.map((card) => card.id)]) {
        assert(evaluated.some((finding) => finding.id === id), `${domain}: every displayed prediction must be a matched rule`);
        assert(result.outcome.sources.some((source) => source.findingId === id), `${domain}: every prediction has its own source`);
      }
      assert(!/not fully present|checks are mixed|not strongly confirmed|not clearly confirmed|pattern is not present/.test(outcomeText), `${domain}: no unmatched-rule fallback predictions`);
      observedScores.get(domain).add(result.score);
      generatedAnswers++;
    });
  }
}
for (const [domain, scores] of observedScores) assert(scores.size > 1, `${domain}: assessment must respond to chart changes`);
const missingDivision = JSON.parse(JSON.stringify(ctx));
delete missingDivision.chart.planets[0].divisionalSigns.D10;
assert.throws(() => rules.answerQuestion(missingDivision, 'How is my career?', 'career'), /D10 chart is incomplete/, 'Missing divisional data must not silently become natal data');
const careerPlacements = new Set();
for (let sign = 1; sign <= 12; sign++) {
  const scenario = JSON.parse(JSON.stringify(ctx));
  scenario.chart.planets.find((position) => position.name === 'Saturn').divisionalSigns.D10 = sign;
  const result = rules.answerQuestion(scenario, 'Which field suits my career?', 'career');
  careerPlacements.add(result.outcome.details.find((text) => text === rules.evaluateBookFindings(scenario, 'career').find((item) => item.id === 'career-style').text));
  assert(result.outcome.sources.some((source) => source.findingId === 'career-style' && source.evidence.includes(`H${sign},`)));
}
assert.equal(careerPlacements.size, 12, 'All twelve profession-lord placements must produce distinct outcome tendencies');
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
assert(windows.some((window) => window.reasons.some((reason) => reason.includes('Chara sign seventh lord'))), 'Marriage timing must check the seventh ruler from the running sign');
timing.chart.charaDashas = [period('Capricorn', 'Capricorn', '2027-01-01', '2027-04-01')];
windows = rules.scoreWindows(timing, significators, '2027-01-01', '2028-01-01', 'D10', [10]);
assert(windows.some((window) => window.system === 'Chara' && window.reasons.some((reason) => reason.includes('10th from AmK'))));
const childrenSigs = rules.significators(timing, {
  primary: [5], secondary: [], karakas: [],
  extras: rules.vargaExtras(timing, 'D7', [5], 'Saptamsa'),
});
timing.chart.charaDashas = [period('Leo', 'Leo', '2027-01-01', '2027-04-01')];
windows = rules.scoreWindows(timing, childrenSigs, '2027-01-01', '2028-01-01', 'D7', [5]);
assert(windows.some((window) => window.system === 'Chara' && window.reasons.some((reason) => reason.includes('5th from PiK'))), 'Saptamsa Chara timing must activate from Putrakaraka');

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
assert.equal(natureAnswer.groups.length, 0, 'Partner qualities must not reuse event-timing panels');
assert.equal(rules.classify('What practices support my spiritual growth?').focus, 'nature');
assert.equal(rules.classify('Which field suits my career?').focus, 'nature');
assert.equal(rules.classify('When may a job change or promotion be favorable?').focus, 'timing');
assert.equal(rules.classify('What does my chart indicate about children and parenting?').domain, 'children');
const incomeAnswer = rules.answerQuestion(timing, 'When could my career and income improve?', 'career');
const jobAnswer = rules.answerQuestion(timing, 'When may a job change be favorable?', 'career');
const promotionAnswer = rules.answerQuestion(timing, 'When may a promotion be favorable?', 'career');
const fieldAnswer = rules.answerQuestion(timing, 'What kind of career suits me?', 'career');
const childrenAnswer = rules.answerQuestion(timing, 'What does my chart indicate about children and parenting?', 'children');
assert(childrenAnswer.technical.some((text) => text.includes('Saptamsa (D7)')), 'children reading must use Saptamsa');
assert(childrenAnswer.groups.length > 0, 'children reading must include dasha timing windows');
assert(childrenAnswer.notes.some((text) => text.includes('cannot establish fertility')), 'children reading must explain its medical limitations');
assert(incomeAnswer.plain[0].includes('2nd house') && incomeAnswer.plain[0].includes('11th'), 'Income must examine resources and gains');
assert(jobAnswer.plain[0].includes('6th house') && jobAnswer.plain[0].includes('10th'), 'Job changes must examine employment and direction');
assert(promotionAnswer.plain[0].includes('10th house') && promotionAnswer.plain[0].includes('11th'), 'Promotion must examine standing and rewards');
assert(incomeAnswer.groups[0].blurb.includes('houses 2, 11'), 'Income timing uses income houses');
assert(jobAnswer.groups[0].blurb.includes('houses 6, 10'), 'Transition timing uses employment houses');
assert(promotionAnswer.groups[0].blurb.includes('houses 10, 11'), 'Promotion timing uses standing and gains');
assert.equal(fieldAnswer.groups.length, 0, 'Suitable fields must not show timing windows');
assert(fieldAnswer.plain[0].includes('strongest career indicators'));
const substantive = (answer) => JSON.stringify({ plain: answer.plain, nature: answer.nature, groups: answer.groups });
assert.equal(new Set([incomeAnswer, jobAnswer, promotionAnswer, fieldAnswer].map(substantive)).size, 4, 'Same-chart career intents must differ beyond the echoed question');
const practiceAnswer = rules.answerQuestion(timing, 'What practices may support my spiritual growth?', 'spiritual');
assert(practiceAnswer.plain[0].includes('sustainable practice'));
assert.equal(practiceAnswer.groups.length, 0);
for (const suggested of rules.SUGGESTED_QUESTIONS) {
  assert.equal(rules.classify(suggested.question).domain, suggested.domain, `Correct topic routing for ${suggested.label}`);
  const answer = rules.answerQuestion(timing, suggested.question, suggested.domain);
  assert(answer && answer.plain.length > 0 && answer.plain.every((text) => !text.includes('undefined')), `Runnable answer for ${suggested.label}`);
}
const selected = timingAnswer.groups[0].windows;
for (const system of ['Vimshottari', 'Yogini', 'Chara']) assert(selected.some((window) => window.system === system), `${system}: representation`);
for (const window of selected) assert(window.relative * 100 <= timingAnswer.score + 0.0001, 'Timing label must respect natal support');
assert(selected.every((window) => !window.plain.includes('probability of')));
console.log(`Ask assessment regressions passed: ${generatedAnswers} generated answers across 12 Ascendants and seven topics, plus generic divisional-house checks.`);
console.log('Three-dasha timing passed: planetary AD activation, DK/PiK/AmK derived houses, dated confluence, system representation and natal-limited labels.');
console.log('Influence and repetition checks passed: node hosts, independent conjunctions, source dignity, mutual aspects, debility mitigation and concise summaries.');
console.log('House/lord coverage passed: all primary houses and divisional houses, occupant lordships, incoming lord aspects and true versus one-way mutual links.');
console.log('Question-intent checks passed: distinct income, transition, promotion and suitable-field readings; children/Saptamsa guidance; focused practice/partner guidance; all suggested questions.');
console.log('Outcome checks passed: jargon-free readings, source traceability, all 12 career placements, and explicit missing-chart errors.');

const findingsFor = (scenario, domain) => rules.evaluateBookFindings(scenario, domain);
const finding = (scenario, domain, id) => findingsFor(scenario, domain).find((item) => item.id === id);
const scenario = () => JSON.parse(JSON.stringify(ctx));
const place = (target, name, house, division) => {
  const position = target.chart.planets.find((item) => item.name === name);
  if (division === 'D1') Object.assign(position, { house, signNumber: house, sign: signs[house - 1], longitude: (house - 1) * 30 + 1 });
  else position.divisionalSigns[division] = house;
};

const propertyRules = scenario();
propertyRules.chart.ascendant.divisionalSigns.D4 = 1;
place(propertyRules, 'Moon', 1, 'D4');
assert(finding(propertyRules, 'property', 'property-residence').text.includes('Changes of residence'));
propertyRules.chart.ascendant.divisionalSigns.D4 = 2;
assert(finding(propertyRules, 'property', 'property-residence').text.includes('settled home base'));
propertyRules.chart.ascendant.divisionalSigns.D4 = 1;
place(propertyRules, 'Mars', 10, 'D4');
assert.equal(finding(propertyRules, 'property', 'property-assets').tone, 'good');
place(propertyRules, 'Mars', 11, 'D4');
assert.equal(finding(propertyRules, 'property', 'property-assets'), undefined, 'An absent asset condition must not produce a prediction');

const growthRules = scenario();
for (const division of ['D1', 'D10']) {
  for (const [name, house] of [['Sun', 10], ['Moon', 3], ['Mars', 6]]) place(growthRules, name, house, division);
}
assert.equal(finding(growthRules, 'career', 'career-growth').tone, 'good');
place(growthRules, 'Mars', 1, 'D10');
assert.equal(finding(growthRules, 'career', 'career-growth'), undefined, 'Two other occupied growth houses are required');
place(growthRules, 'Mars', 6, 'D10');
place(growthRules, 'Sun', 1, 'D1');
assert.equal(finding(growthRules, 'career', 'career-growth'), undefined, 'Natal tenth must be occupied');

const familyRules = scenario();
for (const name of planetNames) place(familyRules, name, 4, 'D9');
place(familyRules, 'Venus', 2, 'D9');
assert.equal(finding(familyRules, 'marriage', 'marriage-family'), undefined, 'A protective second-house owner is not a family-tension rule');
place(familyRules, 'Venus', 4, 'D9');
place(familyRules, 'Mars', 2, 'D9');
assert.equal(finding(familyRules, 'marriage', 'marriage-family').tone, 'bad');
place(familyRules, 'Venus', 2, 'D9');
assert.notEqual(finding(familyRules, 'marriage', 'marriage-family')?.tone, 'bad', 'Own house association protects the family foundation');
for (const item of findingsFor(familyRules, 'marriage')) {
  assert(item.rule && item.book && item.pdfPages && item.evidence, 'Explicit findings must retain page provenance and evaluated conditions');
}
const recoveryRules = scenario();
for (const name of planetNames) place(recoveryRules, name, 4, 'D9');
for (const name of ['Venus', 'Sun', 'Jupiter']) place(recoveryRules, name, 6, 'D9');
assert.equal(finding(recoveryRules, 'marriage', 'marriage-after').tone, 'neutral', 'Benefic mitigation must survive difficult placement');
place(recoveryRules, 'Jupiter', 1, 'D9');
assert.equal(finding(recoveryRules, 'marriage', 'marriage-after').tone, 'bad');
const independenceRules = scenario();
const independencePlacements = { Sun: 1, Moon: 10, Mars: 11, Rahu: 12, Mercury: 2, Jupiter: 4, Saturn: 5, Venus: 6, Ketu: 4 };
for (const division of ['D1', 'D10']) {
  for (const [name, house] of Object.entries(independencePlacements)) place(independenceRules, name, house, division);
}
assert.equal(finding(independenceRules, 'career', 'career-independence').tone, 'good');
place(independenceRules, 'Mercury', 4, 'D10');
assert.equal(finding(independenceRules, 'career', 'career-independence'), undefined, 'Five-planet grouping must not pass with four');

const qualifiedTiming = scenario();
qualifiedTiming.chart.dashas = [period('Venus', 'Venus', '2026-01-01', '2027-04-01')];
qualifiedTiming.chart.charaDashas = [];
qualifiedTiming.chart.yoginiDashas = [period('Siddha', 'Siddha', '2026-01-01', '2027-04-01')];
let qualifiedAnswer = rules.answerQuestion(qualifiedTiming, 'When will I get married?', 'marriage');
assert(qualifiedAnswer.outcome.timing.some((item) => item.system === 'Vimshottari'));
assert(qualifiedAnswer.outcome.timing.every((item) => item.start >= ctx.today && item.start < item.end));
assert(!qualifiedAnswer.outcome.timing.some((item) => item.system === 'Yogini'), 'Ordinary Yogini must not substitute for progressed Yogini');
qualifiedTiming.chart.dashas = [period('Mercury', 'Venus', '2027-01-01', '2027-04-01')];
place(qualifiedTiming, 'Mercury', 3, 'D1');
place(qualifiedTiming, 'Mercury', 3, 'D9');
qualifiedAnswer = rules.answerQuestion(qualifiedTiming, 'When will I get married?', 'marriage');
assert.equal(qualifiedAnswer.outcome.timing.length, 0, 'An unrelated main lord must not qualify through a related sub-lord');
assert(qualifiedAnswer.outcome.summary.includes('inconclusive'));
qualifiedTiming.chart.dashas = [period('Venus', 'Venus', '2027-01-01', '2028-01-01')];
qualifiedTiming.chart.dashas[0].antardashas[0].start = '2026-01-01';
qualifiedTiming.chart.dashas[0].antardashas[0].end = '2029-01-01';
qualifiedAnswer = rules.answerQuestion(qualifiedTiming, 'When will I get married?', 'marriage');
assert.equal(qualifiedAnswer.outcome.timing[0].start, '2027-01-01');
assert.equal(qualifiedAnswer.outcome.timing[0].end, '2028-01-01', 'Sub-period must be clipped to its main period');
qualifiedTiming.chart.dashas = [period('Venus', 'Venus', '2040-01-01', '2041-01-01')];
assert.equal(rules.answerQuestion(qualifiedTiming, 'When will I get married?', 'marriage').outcome.timing.length, 0, 'Exclude periods outside ten-year horizon');

const missingPlanet = scenario();
missingPlanet.chart.planets = missingPlanet.chart.planets.filter((item) => item.name !== 'Venus');
assert.throws(() => rules.answerQuestion(missingPlanet, 'Marriage outlook', 'marriage'), /missing Venus/);
const missingChildTiming = scenario();
delete missingChildTiming.chart.planets[0].divisionalSigns.D9;
assert.throws(() => rules.answerQuestion(missingChildTiming, 'Parenting outlook', 'children'), /D9 chart is incomplete/);
const appearance = rules.answerQuestion(ctx, 'What will my spouse look like?', 'marriage');
assert(appearance.outcome.limitation.includes('physical appearance'));
assert.equal(appearance.outcome.cards.length, 0, 'Do not answer an appearance question with unrelated marriage cards');
const business = rules.answerQuestion(ctx, 'Would business or employment suit my career?', 'career');
assert(!business.outcome.sources.some((source) => source.findingId === 'career-independence'), 'Do not fill an independent-work card when its conditions are absent');
const fields = rules.answerQuestion(ctx, 'Which field suits my career?', 'career');
assert(fields.outcome.sources.some((source) => source.findingId === 'career-fields'), 'Field direction requires an explicit education-to-profession rule');
assert.equal(fields.outcome.timing.length, 0, 'Nature guidance must not contain date cards');
const salary = rules.answerQuestion(ctx, 'How is my salary outlook?', 'career');
assert.equal(salary.outcome.sources.length, 0, 'A salary question must not borrow unrelated style or independence findings');
assert(salary.outcome.summary.includes('inconclusive'));
assert.equal(rules.answerQuestion(timing, 'When will my health improve?', 'health').outcome.timing.length, 0);
for (const question of ['When might I have a baby?', 'What about pregnancy?', 'What about adopting a child?', 'Could I have twins?']) {
  assert.equal(rules.classify(question).domain, 'children');
}

const uiBundle = await build({
  stdin: {
    contents: "import { createElement } from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import { AnswerView } from './src/components/AskCard'; export const renderAnswer = answer => renderToStaticMarkup(createElement(AnswerView, { answer }));",
    resolveDir: root,
  },
  bundle: true, write: false, platform: 'node', format: 'cjs',
  external: ['react', 'react-dom/server', 'react/jsx-runtime'],
  define: { 'import.meta.env.VITE_API_BASE_URL': '""' },
});
const renderedModule = { exports: {} };
new Function('require', 'module', 'exports', uiBundle.outputFiles[0].text)(
  createRequire(new URL('../package.json', import.meta.url)), renderedModule, renderedModule.exports,
);
for (const answer of [appearance, business, fields, childrenAnswer, timingAnswer]) {
  const html = renderedModule.exports.renderAnswer(answer);
  assert(html.includes('reading-grid') && html.includes('Your answer'));
  assert(!html.includes('Your next steps'), 'Do not append canned advice to matched conclusions');
  assert(!/<details|<summary|Rule-based score|Technical timing|book references|Shadbala|Navamsa|Dasamsa|Vimshottari|Yogini/.test(html), 'The entire Ask answer DOM must omit technicals, not merely collapse them');
}
assert(!renderedModule.exports.renderAnswer(fields).includes('Periods to consider'));
assert(renderedModule.exports.renderAnswer(timingAnswer).includes('Periods to consider'));
console.log('Book-condition and card checks passed: growth/grouping thresholds, protective associations and mitigation, residence/assets, qualified timing, progression exclusion, input guards, intent priority and jargon-free rendered cards.');