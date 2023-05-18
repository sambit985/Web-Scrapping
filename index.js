const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const PORT = 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Sending homepage
app.get('/', async (req, res) => {
  const htmlPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(htmlPath);
});


app.post('/scrape', async (req, res) => {
  try {
    const { skill } = req.body;

    const url = `https://in.indeed.com/jobs?q=${skill}&l=Bangalore%2C+Karnataka&from=searchOnHP&vjk=880cbb6c1a2b8056`;

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(url);

    const jobData = await page.evaluate(() => {
      const items = document.querySelectorAll('td.resultContent');
      const data = { list: [] };

      items.forEach((item, index) => {
        console.log(`scraping data of job: ${index}`);
        const title = item.querySelector('h2.jobTitle > a')?.innerText || '';
        const link = item.querySelector('h2.jobTitle > a')?.href || '';
        let salary = item.querySelector('div.metadata.salary-snippet-container > div')?.innerText || 'not defined';
        const companyName = item.querySelector('span.companyName')?.innerText || '';

        data.list.push({
          title: title.trim(),
          salary: salary.trim(),
          companyName: companyName.trim(),
          link: link.trim(),
        });
      });

      return data;
    });

    console.log(`successfully collected ${jobData.list.length} jobs`);
                 
    await browser.close();
    const filePath = path.join(__dirname, 'jobs.json');
    const jsonData = JSON.stringify(jobData, null, 2);

    fs.writeFile(filePath, jsonData, 'utf8', (err) => {
      if (err) {
        console.error('Error writing to JSON file:', err);
      } else {
        console.log('Job data saved to jobs.json');
      }
    });

    res.status(200).json({
      status: 'ok',
      list: jobData.list,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during scraping.',
    });
  }
});


// App to getData
app.get('/getData', async (req, res) => {
  try {
    const jobs = path.join(__dirname, '..', 'jobs.json');
    res.sendFile(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

