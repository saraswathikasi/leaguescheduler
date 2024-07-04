const request = require("supertest");
const cheerio = require("cheerio");
const app = require("../server"); // Adjust the path to your app
const db = require("../models"); // Adjust the path to your models

let server, agent;

function extractCsrfToken(res) {
  const $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, email, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/login").send({
    email,
    password,
    _csrf: csrfToken,
  });
  return res;
};

describe("Sports Scheduler Application", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {
      console.log("Test server running on port 4000");
    });
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Sign up a user", async () => {
    const res = await agent.post("/signup").send({
      name: "Test User",
      email: "testuser@example.com",
      password: "password", // Ensure password is included
      _csrf: csrfToken,
    });
    console.log(res.text); // Log response text for debugging
    expect(res.statusCode).toBe(302);
  });
  

  test("Login a user", async () => {
    let res = await login(agent, "testuser@example.com", "password"); // Ensure credentials are correct
    console.log(res.text); // Log response text for debugging
    expect(res.statusCode).toBe(302);
  });
  

  test("Logout a user", async () => {
    let res = await agent.post("/logout").send({
      _csrf: csrfToken,
    });
    console.log(res.text); // Log response text for debugging
    expect(res.statusCode).toBe(302);
  });
  

  test("Create a sport", async () => {
    await login(agent, "testuser@example.com", "password");
    let res = await agent.get("/admindash");
    let csrfToken = extractCsrfToken(res);
    res = await agent.post("/create-sport").send({
      name: "Football",
      _csrf: csrfToken,
    });
    console.log(res.text); // Log response text for debugging
    expect(res.statusCode).toBe(302);
  });

  test("Create a session", async () => {
    await login(agent, "testuser@example.com", "password");
    let res = await agent.get("/admindash");
    let csrfToken = extractCsrfToken(res);
    res = await agent.post("/create-session").send({
      sport_id: 1,
      team1: "Team A",
      team2: "Team B",
      additional_players: 5,
      date: new Date().toISOString(),
      venue: "Stadium",
      _csrf: csrfToken,
    });
    console.log(res.text); // Log response text for debugging
    expect(res.statusCode).toBe(302);
  });

  test("Join a session", async () => {
    await login(agent, "testuser@example.com", "password");
    let res = await agent.get("/playerdash");
    let csrfToken = extractCsrfToken(res);
    res = await agent.post("/join-session").send({
      session_id: 1,
      _csrf: csrfToken,
    });
    console.log(res.text); // Log response text for debugging
    expect(res.statusCode).toBe(302);
  });

  test("Delete a session", async () => {
    await login(agent, "testuser@example.com", "password");
    let res = await agent.get("/admindash");
    let csrfToken = extractCsrfToken(res);
    res = await agent.post("/delete-session/1").send({
      _csrf: csrfToken,
    });
    console.log(res.text); // Log response text for debugging
    expect(res.statusCode).toBe(302);
  });

  test("Change password", async () => {
    const res = await agent.post("/change-password").send({
      oldPassword: "oldpassword",
      newPassword: "newpassword",
      _csrf: csrfToken,
    });
    console.log(res.text); // Log response text for debugging
    expect(res.statusCode).toBe(200);
  });
  
});