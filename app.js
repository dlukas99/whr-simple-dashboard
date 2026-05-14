const FILE_PATH = "WHRFinal.json";
const MAX_COUNTRIES = 4;

const margin = { top: 30, right: 20, bottom: 100, left: 60 };
const lineSize = { width: 520, height: 380 };
const barSize = { width: 520, height: 320 };

let rawData = [];
let currentYear = 2015;
let playing = false;
let timerId = null;

const countrySelect = document.getElementById("countrySelect");
const metricSelect = document.getElementById("metricSelect");
const yearRange = document.getElementById("yearRange");
const yearLabel = document.getElementById("yearLabel");
const playBtn = document.getElementById("playBtn");

const color = d3.scaleOrdinal(d3.schemeTableau10);

const lineSvg = d3
  .select("#lineChart")
  .append("svg")
  .attr("viewBox", `0 0 ${lineSize.width} ${lineSize.height}`);

const barSvg = d3
  .select("#barChart")
  .append("svg")
  .attr("viewBox", `0 0 ${barSize.width} ${barSize.height}`);

const lineG = lineSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const barG = barSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const lineInner = {
  width: lineSize.width - margin.left - margin.right,
  height: lineSize.height - margin.top - margin.bottom,
};

const barInner = {
  width: barSize.width - margin.left - margin.right,
  height: barSize.height - margin.top - margin.bottom,
};

lineG.append("g").attr("class", "axis x-axis").attr("transform", `translate(0,${lineInner.height})`);
lineG.append("g").attr("class", "axis y-axis");

barG.append("g").attr("class", "axis x-axis").attr("transform", `translate(0,${barInner.height})`);
barG.append("g").attr("class", "axis y-axis");

const lineLayer = lineG.append("g").attr("class", "lines");
const dotLayer = lineG.append("g").attr("class", "dots");
const legendLayer = lineG.append("g").attr("class", "legend");
const yearLayer = lineG.append("g").attr("class", "year-marker");

const lineContainer = d3.select("#lineChart");
const tooltip = lineContainer.append("div").attr("class", "tooltip").style("opacity", 0);

const barLayer = barG.append("g").attr("class", "bars");
const barLabelLayer = barG.append("g").attr("class", "bar-labels");

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseRow(row) {
  return {
    ...row,
    Year: toNumber(row.Year),
    "Happiness Score": toNumber(row["Happiness Score"]),
    GDP: toNumber(row.GDP),
    "Social Support": toNumber(row["Social Support"]),
    "Life Expectancy": toNumber(row["Life Expectancy"]),
    Freedom: toNumber(row.Freedom),
    Generosity: toNumber(row.Generosity),
    Corruption: toNumber(row.Corruption),
  };
}

function getSelectedCountries() {
  const selected = Array.from(countrySelect.selectedOptions).map((opt) => opt.value);
  return selected.slice(0, MAX_COUNTRIES);
}

function setDefaultCountries(countries) {
  const defaults = countries.slice(0, 2);
  Array.from(countrySelect.options).forEach((opt) => {
    opt.selected = defaults.includes(opt.value);
  });
}

function updateYearLabel() {
  yearLabel.textContent = currentYear;
  yearRange.value = currentYear;
}

function buildSeries(selectedCountries, metric) {
  const filtered = rawData.filter((d) => selectedCountries.includes(d.Country));
  const grouped = d3.group(filtered, (d) => d.Country);

  return Array.from(grouped, ([country, values]) => ({
    country,
    values: values
      .filter((d) => d.Year && d[metric] !== null)
      .sort((a, b) => d3.ascending(a.Year, b.Year)),
  }));
}

function closestPoint(values, targetYear) {
  return values.reduce((best, v) => {
    if (!best) return v;
    return Math.abs(v.Year - targetYear) < Math.abs(best.Year - targetYear) ? v : best;
  }, null);
}

function updateLineChart(series, metric) {
  const allValues = series.flatMap((s) => s.values.map((d) => d[metric]));
  const yDomain = d3.extent(allValues);
  const x = d3.scaleLinear().domain([2015, 2023]).range([0, lineInner.width]);
  const y = d3.scaleLinear().domain(yDomain).nice().range([lineInner.height, 0]);

  lineG.select(".x-axis").transition().duration(400).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));
  lineG.select(".y-axis").transition().duration(400).call(d3.axisLeft(y));

  const line = d3
    .line()
    .x((d) => x(d.Year))
    .y((d) => y(d[metric]));

  const lineSelection = lineLayer
    .selectAll("path")
    .data(series, (d) => d.country)
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("fill", "none")
          .attr("stroke-width", 2)
          .attr("stroke", (d) => color(d.country))
          .attr("d", (d) => line(d.values))
          .attr("opacity", 0)
          .call((sel) => sel.transition().duration(500).attr("opacity", 1)),
      (update) =>
        update.call((sel) =>
          sel
            .transition()
            .duration(500)
            .attr("stroke", (d) => color(d.country))
            .attr("d", (d) => line(d.values))
        ),
      (exit) => exit.transition().duration(300).attr("opacity", 0).remove()
    );

  lineSelection
    .on("mouseenter", function (event, d) {
      d3.select(this).attr("stroke-width", 3.5);
      tooltip.style("border-color", color(d.country));
    })
    .on("mousemove", (event, d) => {
      const [mx] = d3.pointer(event, lineG.node());
      const yearValue = x.invert(mx);
      const point = closestPoint(d.values, yearValue);
      if (!point) return;

      const [cx, cy] = d3.pointer(event, lineContainer.node());
      tooltip
        .style("opacity", 1)
        .style("background", color(d.country))
        .style("color", "#fff")
        .style("left", `${cx + 12}px`)
        .style("top", `${cy - 12}px`)
        .text(`${d.country}: ${point[metric].toFixed(2)} (${point.Year})`);
    })
    .on("mouseleave", function () {
      d3.select(this).attr("stroke-width", 2);
      tooltip.style("opacity", 0);
    });

  const points = series
    .map((s) => {
      const match = s.values.find((v) => v.Year === currentYear);
      if (!match) return null;
      return { country: s.country, value: match[metric], year: match.Year };
    })
    .filter(Boolean);

  dotLayer
    .selectAll("circle")
    .data(points, (d) => d.country)
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("r", 4)
          .attr("cx", (d) => x(d.year))
          .attr("cy", (d) => y(d.value))
          .attr("fill", (d) => color(d.country))
          .attr("opacity", 0)
          .call((sel) => sel.transition().duration(300).attr("opacity", 1)),
      (update) =>
        update.call((sel) =>
          sel
            .transition()
            .duration(300)
            .attr("cx", (d) => x(d.year))
            .attr("cy", (d) => y(d.value))
        ),
      (exit) => exit.transition().duration(200).attr("opacity", 0).remove()
    );

  const legendWidth = 160;
  const legendHeight = series.length * 16 + 10;
  const legendX = 0;
  const legendY = lineInner.height + 22;

  legendLayer.attr("transform", `translate(${legendX},${legendY})`);

  legendLayer
    .selectAll("rect")
    .data([null])
    .join((enter) => enter.append("rect"))
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("rx", 6)
    .attr("ry", 6)
    .attr("fill", "rgba(255, 255, 255, 0.85)")
    .attr("stroke", "#ddd")
    .lower();

  legendLayer
    .selectAll("text")
    .data(series, (d) => d.country)
    .join(
      (enter) => enter.append("text"),
      (update) => update,
      (exit) => exit.remove()
    )
    .attr("x", 8)
    .attr("y", (d, i) => 16 + i * 16)
    .attr("text-anchor", "start")
    .attr("fill", (d) => color(d.country))
    .text((d) => d.country);

  const yearLine = yearLayer.selectAll("line").data([currentYear]);
  yearLine
    .join((enter) => enter.append("line").attr("class", "current-year"))
    .transition()
    .duration(300)
    .attr("x1", x(currentYear))
    .attr("x2", x(currentYear))
    .attr("y1", 0)
    .attr("y2", lineInner.height);
}

function updateBarChart(series, metric) {
  const barData = series
    .map((s) => {
      const match = s.values.find((v) => v.Year === currentYear);
      return match ? { country: s.country, value: match[metric] } : null;
    })
    .filter(Boolean);

  const x = d3.scaleBand().domain(barData.map((d) => d.country)).range([0, barInner.width]).padding(0.3);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(barData, (d) => d.value) || 1])
    .nice()
    .range([barInner.height, 0]);

  barG.select(".x-axis").transition().duration(300).call(d3.axisBottom(x));
  barG.select(".y-axis").transition().duration(300).call(d3.axisLeft(y));

  barG
    .select(".x-axis")
    .selectAll("text")
    .attr("fill", (d) => color(d))
    .attr("font-weight", 600);

  barLayer
    .selectAll("rect")
    .data(barData, (d) => d.country)
    .join(
      (enter) =>
        enter
          .append("rect")
          .attr("x", (d) => x(d.country))
          .attr("width", x.bandwidth())
          .attr("y", barInner.height)
          .attr("height", 0)
          .attr("fill", (d) => color(d.country))
          .call((sel) =>
            sel
              .transition()
              .duration(500)
              .attr("y", (d) => y(d.value))
              .attr("height", (d) => barInner.height - y(d.value))
          ),
      (update) =>
        update.call((sel) =>
          sel
            .transition()
            .duration(500)
            .attr("x", (d) => x(d.country))
            .attr("width", x.bandwidth())
            .attr("y", (d) => y(d.value))
            .attr("height", (d) => barInner.height - y(d.value))
            .attr("fill", (d) => color(d.country))
        ),
      (exit) => exit.transition().duration(300).attr("height", 0).attr("y", barInner.height).remove()
    );

  barLabelLayer
    .selectAll("text")
    .data(barData, (d) => d.country)
    .join(
      (enter) => enter.append("text").attr("text-anchor", "middle").attr("fill", "#333"),
      (update) => update,
      (exit) => exit.remove()
    )
    .transition()
    .duration(300)
    .attr("x", (d) => x(d.country) + x.bandwidth() / 2)
    .attr("y", (d) => y(d.value) - 6)
    .text((d) => d.value.toFixed(2));
}

function updateCharts() {
  const metric = metricSelect.value;
  const selectedCountries = getSelectedCountries();

  const series = buildSeries(selectedCountries, metric);
  updateLineChart(series, metric);
  updateBarChart(series, metric);
}

function stepYear() {
  currentYear = currentYear < 2023 ? currentYear + 1 : 2015;
  updateYearLabel();
  updateCharts();
}

function togglePlay() {
  playing = !playing;
  playBtn.textContent = playing ? "Pause" : "Play";

  if (playing) {
    timerId = setInterval(stepYear, 900);
  } else {
    clearInterval(timerId);
  }
}

function handleCountryChange() {
  const selected = Array.from(countrySelect.selectedOptions);
  if (selected.length > MAX_COUNTRIES) {
    selected.slice(MAX_COUNTRIES).forEach((opt) => (opt.selected = false));
  }
  updateCharts();
}

function initControls(countries) {
  countries.forEach((country) => {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    countrySelect.appendChild(option);
  });

  setDefaultCountries(countries);
  updateYearLabel();

  countrySelect.addEventListener("change", handleCountryChange);
  metricSelect.addEventListener("change", updateCharts);
  yearRange.addEventListener("input", (event) => {
    currentYear = Number(event.target.value);
    updateYearLabel();
    updateCharts();
  });
  playBtn.addEventListener("click", togglePlay);
}

async function init() {
  const data = await d3.json(FILE_PATH);
  rawData = data.map(parseRow).filter((d) => d.Country && d.Year);

  const countries = Array.from(new Set(rawData.map((d) => d.Country))).sort();
  color.domain(countries);

  initControls(countries);
  updateCharts();
}

init();
