# Corkboard Project


<img src="client/images/corkboardlogo.png" alt="Corkboard Logo" width="20%">


**Corkboard** is a web project developed by **Lara Hallermaier**, **Philip Ebinger**, and **Julian Schörg** as part of a course at FH Campus Wien. <br>
Corkboard is an online messaging application designed and implemented within the scope of our lecture.

---

## **Initialize**

This app runs on **Node.js** with `server.js` as the entry point.  
It uses a **MySQL** database, which requires configuration in the `db.js` file.

### Environment Variables

The following variables must be defined in an `.env` file to run the application:

#### API Keys
| Key Name            | Description                                          | Reference Link                                                                 |
|---------------------|------------------------------------------------------|-------------------------------------------------------------------------------|
| `OPENAI_API_KEY`    | API key for OpenAI integration                       | [API Documentation](https://platform.openai.com/docs/api-reference/introduction) |
| `API_EMOJI_KEY`     | API key for accessing the emoji API                  | [API Documentation](https://emoji-api.com/)                                    |
| `SECRETE_KEY`       | String used to encrypt JSON Web Tokens (JWTs)        | -                                                                             |

#### Database Configuration
| Key Name         | Description                  |
|------------------|------------------------------|
| `DBuser`         | MySQL database login user   |
| `DBpassword`     | MySQL database login password |

---

###  **Directory Structure**
Provide a brief overview of the project's folder organization if necessary:

- `client/` - Frontend assets (e.g., images, styles).
- `server.js` - Main application server file.
- `models/` - Data Structure 
- `db.js` - Database configuration file.

---