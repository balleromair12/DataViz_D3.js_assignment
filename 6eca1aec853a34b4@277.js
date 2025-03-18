function _1(md){return(
md`# D3 assignment

I used the scatterplot template from Observable and also sought assistance from ChatGPT, as I was unable to find any provided resources to guide me in this assignment.`
)}

async function _2(FileAttachment,d3)
{
let data = await FileAttachment("temperature_daily.csv").csv();

// Parse and preprocess the data
data.forEach(d => {
  d.date = new Date(d.date); // Convert the date to a Date object
  d.year = d.date.getFullYear(); // Extract the year
  d.month = d.date.getMonth() + 1; // Extract the month (1-12)
  d.max_temp = +d.max_temperature; // Ensure max_temp is a number
  d.min_temp = +d.min_temperature; // Ensure min_temp is a number
});

// Group the data by year and month
let groupedData = d3.group(data, d => d.year, d => d.month);

// Calculate max and min temperatures for each group (year, month)
let result = [];

groupedData.forEach((yearMap, year) => {
    yearMap.forEach((monthData, month) => {
        const maxTemp = d3.max(monthData, d => d.max_temp); // Max of max_temp
        const minTemp = d3.min(monthData, d => d.min_temp); // Min of min_temp
        
        result.push({
            year: year,
            month: month,
            maxTemp: maxTemp,
            minTemp: minTemp
        });
    });
});

  return result;
}


async function _chart2(FileAttachment,d3)
{
  // Set dimensions
  const width = 900;
  const height = 500;
  const marginTop = 50;
  const marginRight = 50;
  const marginBottom = 50;
  const marginLeft = 100;

  // Load data
  let data = await FileAttachment("temperature_daily.csv").csv();

  // Splitting the date column and obtaining the month and the year for each entry in the dataset
  data.forEach(d => {
      d.date = new Date(d.date);
      d.year = d.date.getFullYear();
      d.month = d.date.getMonth() + 1; // Convert to 1-12
      d.max_temp = +d.max_temperature;
      d.min_temp = +d.min_temperature;
  });

  // Grouping by month and year
  const tempByMonth = d3.rollup(
      data,
      v => ({
          max: d3.max(v, d => d.max_temp),
          min: d3.min(v, d => d.min_temp),
      }),
      d => d.year,
      d => d.month
  );
  const months = d3.range(1, 13);
  // Get only the years that are present in the dataset
  const years = Array.from(new Set(data.map(d => d.year))).sort();
  const yearsWithoutFirst = years.slice(1); // This removes the first year
  
  const x = d3.scaleBand().domain(yearsWithoutFirst).range([marginLeft, width - marginRight]).padding(0.05);
  const y = d3.scaleBand().domain(months).range([marginTop, height - marginBottom]).padding(0.05);
  
  const color = d3.scaleSequential(d3.interpolateRdYlGn)
      .domain([d3.min(data, d => d.min_temp), d3.max(data, d => d.max_temp)]);

  // Create SVG
  const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

  // Tooltip
  const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "white")
      .style("padding", "5px")
      .style("border", "1px solid #ddd")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("visibility", "hidden");

  let showMax = true; 

  function updateView() {
      svg.selectAll(".cell").remove();

      svg.append("g")
          .selectAll("rect")
          .data(yearsWithoutFirst.flatMap(year => months.map(month => ({ year, month }))))
          .join("rect")
          .attr("class", "cell")
          .attr("x", d => x(d.year))
          .attr("y", d => y(d.month))
          .attr("width", x.bandwidth())
          .attr("height", y.bandwidth())
          .attr("fill", d => {
            const temp = tempByMonth.get(d.year)?.get(d.month);
            return temp ? color(showMax ? temp.max : temp.min) : "#ccc"; // Fill with color based on temperature
        })
          .on("mouseover", function (event, d) {
              const temp = tempByMonth.get(d.year)?.get(d.month);
              if (temp) {
                  tooltip.style("visibility", "visible")
                      .html(`Date: ${d.year}-${String(d.month).padStart(2, '0')}<br>Max: ${temp.max}°C Min: ${temp.min}°C`)
                      .style("left", (event.pageX + 10) + "px")
                      .style("top", (event.pageY - 20) + "px");
              }
          })
          .on("mousemove", (event) => {
              tooltip.style("left", (event.pageX + 10) + "px")
                     .style("top", (event.pageY - 20) + "px");
          })
          .on("mouseout", () => {
              tooltip.style("visibility", "hidden");
          })
          .on("click", () => {
              showMax = !showMax;
              updateView();
          });
  }

  updateView();

  svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).tickFormat(m => ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1]));

  const legendWidth = 15;
  const legendHeight = height - marginBottom - marginTop;
  const legendX = width - marginRight + 20;

  const legend = svg.append("g")
      .attr("transform", `translate(${legendX}, ${marginTop})`);

  // Legend scale
  const legendScale = d3.scaleLinear()
      .domain(color.domain()) // Use actual temperature range
      .range([legendHeight, 0]);

  const legendAxis = d3.axisRight(legendScale).ticks(6).tickFormat(d => `${d}°C`);

  const legendGradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%").attr("x2", "0%")
      .attr("y1", "100%").attr("y2", "0%");

  const numStops = 10;
  const legendValues = d3.range(0, 1.01, 1 / numStops); // Normalize stops

  legendGradient.selectAll("stop")
      .data(legendValues)
      .enter().append("stop")
      .attr("offset", d => `${d * 100}%`)
      .attr("stop-color", d => color(legendScale.invert(d * legendHeight)));

  // Draw the legend color bar
  legend.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

  // Add the legend axis
  legend.append("g")
      .attr("transform", `translate(${legendWidth},0)`)
      .call(legendAxis);
  return svg.node();
}


async function _chart4(FileAttachment,d3)
{
  const width = 900;
  const height = 500;
  const marginTop = 50;
  const marginRight = 100;
  const marginBottom = 50;
  const marginLeft = 100;

  let data = await FileAttachment("temperature_daily.csv").csv();

  data.forEach(d => {
      d.date = new Date(d.date);
      d.year = d.date.getFullYear();
      d.month = d.date.getMonth() + 1;
      d.day = d.date.getDate();
      d.max_temp = +d.max_temperature;
      d.min_temp = +d.min_temperature;
  });

  // Filter for last 10 years
  const recentYears = d3.max(data, d => d.year) - 9;
  data = data.filter(d => d.year >= recentYears);

  // Aggregate data by year & month for heatmap colors
  const tempByMonth = d3.rollup(
      data,
      v => ({
          max: d3.max(v, d => d.max_temp),
          min: d3.min(v, d => d.min_temp),
          avg: d3.mean(v, d => (d.max_temp + d.min_temp) / 2)
      }),
      d => d.year,
      d => d.month
  );

  // Group data by year, month, and day for sparklines
  const groupedData = d3.group(data, d => d.year, d => d.month);

  const months = d3.range(1, 13);
  const years = Array.from(new Set(data.map(d => d.year))).sort();
  const yearsWithoutFirst = years.slice(1);

  const x = d3.scaleBand().domain(yearsWithoutFirst).range([marginLeft, width - marginRight]).padding(0.05);
  const y = d3.scaleBand().domain(months).range([marginTop, height - marginBottom]).padding(0.05);

  const color = d3.scaleSequential(d3.interpolateRdYlGn)
      .domain([d3.min(data, d => d.min_temp), d3.max(data, d => d.max_temp)]);

  // Create SVG
  const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

  // Tooltip
  const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "white")
      .style("padding", "5px")
      .style("border", "1px solid #ddd")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("visibility", "hidden");

  function updateView() {
      svg.selectAll(".cell").remove();

      const cells = svg.selectAll(".cell")
          .data(yearsWithoutFirst.flatMap(year => months.map(month => ({ year, month }))))
          .enter()
          .append("g")
          .attr("class", "cell")
          .attr("transform", d => `translate(${x(d.year)},${y(d.month)})`);

      cells.append("rect")
          .attr("width", x.bandwidth())
          .attr("height", y.bandwidth())
          .attr("fill", d => {
              const temp = tempByMonth.get(d.year)?.get(d.month);
              return temp ? color(temp.avg) : "#ccc";
          })
          .attr("stroke", "white");

      cells.each(function(d) {
          let monthData = groupedData.get(d.year)?.get(d.month);
          
          if (monthData) {
              let cellWidth = x.bandwidth();
              let cellHeight = y.bandwidth();

              let xMini = d3.scaleLinear().domain([1, d3.max(monthData, d => d.day)]).range([5, cellWidth - 5]);
              let yMini = d3.scaleLinear().domain([
                  d3.min(monthData, d => d.min_temp),
                  d3.max(monthData, d => d.max_temp)
              ]).range([cellHeight - 5, 5]);

              let lineMax = d3.line()
                  .x(d => xMini(d.day))
                  .y(d => yMini(d.max_temp));

              let lineMin = d3.line()
                  .x(d => xMini(d.day))
                  .y(d => yMini(d.min_temp));

              let cell = d3.select(this);

              cell.append("path")
                  .datum(monthData)
                  .attr("d", lineMax)
                  .attr("stroke", "red")
                  .attr("fill", "none")
                  .attr("stroke-width", 1);

              cell.append("path")
                  .datum(monthData)
                  .attr("d", lineMin)
                  .attr("stroke", "blue")
                  .attr("fill", "none")
                  .attr("stroke-width", 1);
          }
      });

      cells.on("mouseover", function(event, d) {
          const temp = tempByMonth.get(d.year)?.get(d.month);
          if (temp) {
              tooltip.style("visibility", "visible")
                  .html(`Date: ${d.year}-${String(d.month).padStart(2, '0')}<br>Max: ${temp.max}°C Min: ${temp.min}°C`)
                  .style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 20) + "px");
          }
      })
      .on("mousemove", (event) => {
          tooltip.style("left", (event.pageX + 10) + "px")
                 .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", () => {
          tooltip.style("visibility", "hidden");
      });
  }

  updateView();


  svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).tickFormat(m => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]));

  const legendWidth = 15;
  const legendHeight = height - marginBottom - marginTop;
  const legendX = width - marginRight + 20;

  const legend = svg.append("g")
      .attr("transform", `translate(${legendX}, ${marginTop})`);


  const legendScale = d3.scaleLinear()
      .domain(color.domain()) // Use actual temperature range
      .range([legendHeight, 0]);

  const legendAxis = d3.axisRight(legendScale).ticks(6).tickFormat(d => `${d}°C`);

  const legendGradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%").attr("x2", "0%")
      .attr("y1", "100%").attr("y2", "0%");


  const numStops = 10;
  const legendValues = d3.range(0, 1.01, 1 / numStops); // Normalize stops

  legendGradient.selectAll("stop")
      .data(legendValues)
      .enter().append("stop")
      .attr("offset", d => `${d * 100}%`)
      .attr("stop-color", d => color(legendScale.invert(d * legendHeight)));


  legend.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

  legend.append("g")
      .attr("transform", `translate(${legendWidth},0)`)
      .call(legendAxis);

  return svg.node();
}


export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["temperature_daily.csv", {url: new URL("./files/b14b4f364b839e451743331d515692dfc66046924d40e4bff6502f032bd591975811b46cb81d1e7e540231b79a2fa0f4299b0e339e0358f08bef900595e74b15.csv", import.meta.url), mimeType: "text/csv", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["FileAttachment","d3"], _2);
  main.variable(observer("chart2")).define("chart2", ["FileAttachment","d3"], _chart2);
  main.variable(observer("chart4")).define("chart4", ["FileAttachment","d3"], _chart4);
  return main;
}
