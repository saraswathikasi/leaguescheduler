const request = require("supertest");
const cheerio = require("cheerio");
const app = require("../server"); // Adjust the path to your app
const db = require("../models");

let server, agent;

beforeAll(async () => {
  await db.sequelize.sync({ force: true }); // Sync database schema
  server = app.listen(4000, () => {
    console.log("Test server running on port 4000");
  });
  agent = request.agent(server); // Use agent to persist session cookies
});

afterAll(async () => {
  try {
    if (server) {
      await server.close();
      console.log("Server closed");
    }
    await db.sequelize.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error closing connections:", error);
  }
});

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

  test("Sign up a user", async () => {
    let res = await agent.get("/register");
    let csrfToken = extractCsrfToken(res);

    res = await agent.post("/register").send({
      name: "Test User",
      email: "testuser@example.com",
      password: "password",
      role: "player",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test("Login a user", async () => {
    let res = await login(agent, "testuser@example.com", "password");
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/playerdash');
  });

  test("Logout a user", async () => {
    await login(agent, "testuser@example.com", "password");

    let res = await agent.get("/logout");
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test("Create a sport", async () => {
    await login(agent, "testuser@example.com", "password");

    let res = await agent.get("/admindash");
    let csrfToken = extractCsrfToken(res);

    res = await agent.post("/create-sport").send({
      name: "Football",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/admindash');
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
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/admindash');
  });

  test("Join a session", async () => {
    await login(agent, "testuser@example.com", "password");

    let res = await agent.get("/playerdash");
    let csrfToken = extractCsrfToken(res);

    res = await agent.post("/join-session").send({
      session_id: 1,
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(200); // Assuming successful join returns 200
  });

  test("Delete a session", async () => {
    await login(agent, "testuser@example.com", "password");

    let res = await agent.get("/admindash");
    let csrfToken = extractCsrfToken(res);

    res = await agent.post("/delete-session/1").send({
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/admindash');
  });

  test("Change password", async () => {
    await login(agent, "testuser@example.com", "password");

    let res = await agent.get("/change");
    let csrfToken = extractCsrfToken(res);

    res = await agent.post("/change-password").send({
      currentPassword: "password",
      newPassword: "newpassword",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(200);
  });
});
