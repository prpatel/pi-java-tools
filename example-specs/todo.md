# Full-Stack Todo Application

A Spring Boot-based web application for task management, featuring a server-side rendered Thymeleaf UI and a REST API backend, built using Java 21.

## Overview

Build a production-ready, full-stack Todo application. The application will serve a clean, minimalist web interface using Thymeleaf for initial page loads, paired with Vanilla JavaScript to interact asynchronously with the backend API for a seamless, frictionless user experience.

## Technical Stack

- **Backend Framework**: Spring Boot 3.x
- **Language**: Java 21
- **Build Tool**: Maven
- **Database**: H2 (In-memory) for simplicity
- **Frontend UI**: Thymeleaf (Server-Side Rendering)
- **Frontend Assets**: Standard HTML5, CSS3, Vanilla JavaScript (Fetch API)
- **Testing**: JUnit 5, MockMvc, Mockito

## Requirements

### Data Model

```java
Todo:
  id: UUID (auto-generated)
  title: String (1-255 chars)
  completed: boolean (defaults to false)
  createdAt: OffsetDateTime
  updatedAt: OffsetDateTime
```

### Application Routes & Endpoints

**1. Web Interface (Thymeleaf)**
- **GET /** - Main application view
  - Action: Fetches all tasks (or filtered tasks via query param `?status=`) from the database.
  - Return: `index.html` Thymeleaf template populated with the `todos` model attribute.

**2. REST API (For Asynchronous JavaScript Interactions)**
- **POST /api/todos** - Create a task
- **PUT /api/todos/{todo_id}** - Update task (e.g., toggle completion)
- **DELETE /api/todos/{todo_id}** - Delete a specific task
- **DELETE /api/todos/completed** - Clear all completed tasks

*(Note: Validation rules and HTTP status codes for the API remain identical to the previous backend specification).*

### User Interface (UI) Specifications

**1. Layout & Styling (`styles.css`)**
- A standard, centered single-column layout.
- Clean, minimalist aesthetic (e.g., sans-serif typography, soft shadows, clear focus states on inputs).
- Completed tasks should visually change (e.g., greyed out text with a strikethrough).

**2. DOM Structure (`index.html` via Thymeleaf)**
- **Header:** Application title (`<h1>todos</h1>`).
- **Input Form:** A text input field (`<input type="text">`) mapping to the creation API.
- **Task List:** A `<ul>` where each `<li>` represents a Todo item.
  - Rendered server-side initially via Thymeleaf (`th:each="todo : ${todos}"`).
  - Contains a checkbox (`th:checked="${todo.completed}"`), the title, and a delete button.
- **Footer:**
  - Dynamic item counter (e.g., "X items left").
  - Filter links: All | Active | Completed (these can navigate to `/?status=ACTIVE`, etc.).
  - "Clear completed" button.

**3. Frontend Logic (`app.js`)**
- **Form Submission:** Intercept the "Add Task" form submission, prevent the default page reload, and send a `POST` request using the `fetch()` API. On success, append the new item to the DOM.
- **Toggle Completion:** Add event listeners to checkboxes. On click, send a `PUT` request to `/api/todos/{id}`. On success, toggle the CSS class for the strikethrough effect.
- **Delete Item:** Add event listeners to delete buttons. On click, send a `DELETE` request to `/api/todos/{id}`. On success, remove the DOM element.
- **Clear Completed:** Send a `DELETE` request to `/api/todos/completed`. On success, remove all completed DOM elements and update the counter.

## Project Structure

```text
todo-app/
├── pom.xml                           # Maven configuration
├── src/main/java/com/example/todo/
│   ├── TodoApplication.java
│   ├── controller/
│   │   ├── WebController.java        # Returns Thymeleaf views
│   │   └── TodoRestController.java   # Handles AJAX JSON requests
│   ├── dto/
│   ├── model/
│   ├── repository/
│   └── service/
├── src/main/resources/
│   ├── application.yml               # App configuration & H2 settings
│   ├── static/                       # Static web assets
│   │   ├── css/styles.css
│   │   └── js/app.js
│   └── templates/                    # Thymeleaf templates
│       └── index.html
└── src/test/java/com/example/todo/
```

## Test Coverage Requirements

*(Retains all previous Unit and API test requirements, adding the following for the web layer)*

**Web Layer Tests (WebControllerTest.java):**
- MockMvc test to verify `GET /` returns the correct view name (`"index"`).
- Verify the Thymeleaf model contains the `todos` attribute.
- Verify status filtering query parameters properly update the `todos` model attribute.

## Code Quality Standards

### Frontend Best Practices
- **Semantic HTML:** Use proper HTML5 tags (`<main>`, `<section>`, `<footer>`, `<button>`).
- **Separation of Concerns:** Keep CSS in `styles.css` and JavaScript in `app.js`. Do not use inline styles or inline `onclick` handlers in the HTML.
- **Accessibility (a11y):** Ensure inputs have associated labels (or `aria-labels`), and the app is navigable via keyboard.
- **Graceful Degradation:** The Thymeleaf template should be capable of rendering the current state of the database accurately on a hard page refresh, ensuring state isn't lost if JS fails.

### Backend Best Practices
- Strict layered architecture.
- Use Java 21 Records for API Request/Response DTOs.
- Handle exceptions gracefully, ensuring the REST API returns proper JSON problem details even when invoked from the frontend JS.

## Running the Application

### Setup
```bash
# Clone project
cd todo-app

# Run server
./mvnw spring-boot:run
```

### Accessing the App
Open a web browser and navigate to:
`http://localhost:8080/`

## Success Criteria

- The application runs successfully via the Maven wrapper.
- Navigating to `/` displays the fully styled Thymeleaf interface.
- Users can add, toggle, and delete tasks without the page reloading (via Vanilla JS fetch calls).
- The task list state persists correctly in the H2 database across page reloads.
- Filtering by All/Active/Completed accurately updates the view.
- All backend unit and integration tests pass with >90% coverage.
