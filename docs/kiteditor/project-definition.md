

**KITEditor**

Project Definition

| Team Members: | Jacqueline Andrä Kevin Schönmayer Viola Eistetter Philip Reimann Phoebe Ziegler  |
| ----: | ----- |
| Author: | Jacqueline Andrä Kevin Schönmayer Viola Eistetter Philip Reimann Phoebe Ziegler |

**Table of Contents**

 

[**1 Executive Summary	1**](#executive-summary)

[**2 Initial Situation and Problem Scenario	1**](#initial-situation-and-problem-scenario)

[**3 Vision/Project Goal	1**](#vision/project-goal)

[**4 Project Content/Scope	2**](#project-content/scope)

[**5 Planning and Organisation	3**](#planning-and-organisation)

[5.1 Project Organisation	3](#project-organisation)

[5.2 Time Management	3](#time-management)

[1\. Sprint: Oct 8 – 21, 2026	4](#1.-sprint:-oct-8-–-21,-2026)

[2\. Sprint: Oct 22 – Nov 4, 2026	4](#2.-sprint:-oct-22-–-nov-4,-2026)

[3\. Sprint: Nov 5 – 18, 2026	4](#3.-sprint:-nov-5-–-18,-2026)

[4\. Sprint: Nov 19 – Dec 2, 2026	5](#4.-sprint:-nov-19-–-dec-2,-2026)

[5\. Sprint: Dec 3 – 16, 2026	5](#5.-sprint:-dec-3-–-16,-2026)

[7\. Sprint: Dec 31, 2026 – Jan 13, 2027	5](#7.-sprint:-dec-31,-2026-–-jan-13,-2027)

[**6 Informing the Clients	6**](#informing-the-clients)

[1\. Client Communication	6](#client-communication)

[2\. Utilization and Structure of Gitlab	6](#utilization-and-structure-of-gitlab)

[3\. Design and Structure of the Wiki	7](#design-and-structure-of-the-wiki)

[**7 Stakeholder and Project Organisation	7**](#stakeholder-and-project-organisation)

**Changes**

| Version | Date | Reason for Changes, Notes | Edited by |
| :---- | :---- | :---- | :---- |
| V0.1 | 11.10.2026 | Initial Setup | Viola Eistetter  |
| V0.2 | 13.10.2026 | Adding scope and backlog | Viola Eistetter |

1. # **Executive Summary** {#executive-summary}

   FOR storytellers, educators, and communication trainers 

   WHO HAVE the need to create interactive, branching dialogues easily, 

   KITEditor IS A standalone offline dialogue‑creation tool 

   THAT enables users to build fully functional dialogue systems in under 15 minutes without any programming knowledge.

   UNLIKE complex development frameworks or applications on the internet, 

   THE PRODUCT offers a one-time installation with no dependencies and full customization of visuals and colors.

   

2. # **Initial Situation and Problem Scenario** {#initial-situation-and-problem-scenario}

   

   Communication training in companies is often repetitive, time-consuming and expensive. Interactive training apps like KITE can help improve this by making training more engaging.

   

   KITE is a simple web application where the user plays through a preset scenario by being given several dialogue options and set responses. After a scenario is finished, an AI gives feedback on how some dialogue options may be perceived by real people, education on potential biases.

   

   The problem is that creating or customizing such scenarios in apps like KITE often requires programming knowledge.

   

   There are already different solutions, such as Twinery, Ren’Py, traditional human communication and professional trainers. However, these solutions either require technical skills or can be expensive and time-consuming. 

   

   Therefore, there is a need for a simple way to create and customize interactive applications without coding knowledge, making them accessible to everyone.

   

3. # **Vision/Project Goal** {#vision/project-goal}

   

   The goal of this project is to make the creation of interactive dialogues simple, fast, and accessible to everyone. 

   Existing interactive tools like KITE demonstrate the value of scenario-based training, but they still require programming knowledge to create or customize content. Other alternatives such as Twinery, RenPy, or professional trainers either demand technical expertise or come with significant financial and organizational overhead.

   The vision of this project is to eliminate these barriers by providing a standalone, offline, no‑dependencies application that allows users to create branching dialogue scenarios in minutes, without any coding. 

   This enables educators, storytellers, trainers, and creative professionals to focus on content rather than technology.

   

4. # **Project Content/Scope** {#project-content/scope}

The project focuses on developing KITEditor, a standalone offline application that allows users to create and customize interactive dialogue scenarios without programming knowledge. 

The application will provide a simple, user-friendly editor where users can create projects, add and connect dialogue steps, and define different response options. Users will also be able to customize the appearance of their application by changing text, colors, backgrounds and logos. A preview function will allow users to test their scenarios before finishing them. 

The project includes the development of the user interface, the implementation of the main editing functions, and the ability to save and load projects. The application should work offline without requiring an internet connection. 

5. # **Planning and Organisation** {#planning-and-organisation}

   1. ## **Project Organisation**  {#project-organisation}

      In Scrum, the scope is determined for each sprint, while resources and schedule remain fixed throughout the project duration. 

   

      In order for the team to stay in constant contact, there are various meetings. All communication and documentation is facilitated by Discord and GitLab. 

      The Documentation for the meetings can be found in the GitLab Wiki under the respective Header.

      

| Meeting | Moderation | Protocol |
| :---- | :---- | :---- |
| Dailies | Kevin | Round Robin |
| Reviews | Viola | Round Robin |
| Retrospectives | Kevin | Kevin |
| Planning Poker | Viola | Viola |
| Sprint Planning | Viola | Round Robin |

      

      Other than that, a lot of communication happens through the mandatory reviews on merge requests and the comments under the issues.

      

      **Definition of Done:**

      In order for an issue to be classified as “done”, it has to:

* Fulfill all acceptance criteria as documented in GitLab  
* Be committed and pushed to a merge request  
* Have two git reviews with no further needs for revision  
* Be merged into develop

  After an issue is “done”, it still has to be accepted by the product owner at the “review” meeting to be closed.

  2. ## **Time Management** {#time-management}


| Every Sprint is 2 Weeks long. There are 7 Sprints in total, effectively 6 because of the holidays and the new year, with the final presentation being on the 14th of January. Per Sprint, every developer officially has 48 hours. With five developers, that adds up to 240 hours per Sprint or 1440 hours for the entire project.  Schedule Kickoff: Oct 1, 2026 1\. Sprint: Oct 8 – 21, 2026   Planning Poker & Sprint Planning: Oct 11, 2026   Dailies: Oct 12, 2026 13:00 Online 20 Minutes Oct 14, 2026 14:00 Online 20 Minutes Oct 15, 2026 \[variable\] 14:00 “Semestersprecherraum” 20 Minutes Oct 19, 2026 13:00 Online 20 Minutes Oct 21, 2026 14:00 Online 20 Minutes   Oct 22, 2026 Review “Semestersprecherraum” 14:00 1 hour   Oct 22, 2026 Retrospective “Semestersprecherraum” 15:30 30min       2\. Sprint: Oct 22 – Nov 4, 2026   Planning Poker & Sprint Planning: Oct 25, 2026   Dailies: Oct 26, 2026 13:00 Online 20 Minutes Oct 28, 2026 14:00 Online 20 Minutes Oct 29, 2026 \[variable\] 14:00 “Semestersprecherraum” 20 Minutes Nov 2, 2026 13:00 Online 20 Minutes Nov 4, 2026 14:00 Online 20 Minutes   Presentation 1: Oct 29, 2026   Milestone 1: Project Definition \+ AI Campus Course: Oct 29, 2026   Nov 5, 2026 Review “Semestersprecherraum” 14:00 1 hour   Nov 5, 2026 Retrospective “Semestersprecherraum” 15:30 30min 3\. Sprint: Nov 5 – 18, 2026   Planning Poker & Sprint Planning: Nov 8, 2026   Dailies: Nov 9, 2026 13:00 Online 20 Minutes Nov 11, 2026 14:00 Online 20 Minutes Nov 12, 2026 \[variable\] 14:00 “Semestersprecherraum” 20 Minutes Nov 16, 2026 13:00 Online 20 Minutes Nov 18, 2026 14:00 Online 20 Minutes   Nov 19, 2026 Review “Semestersprecherraum” 14:00 1 hour   Nov 19, 2026 Retrospective “Semestersprecherraum” 15:30 30min 4\. Sprint: Nov 19 – Dec 2, 2026   Planning Poker & Sprint Planning: Nov 22, 2026   Dailies: Nov 30, 2026 13:00 Online 20 Minutes Dec 2, 2026 14:00 Online 20 Minutes   Block Week: Nov 23 \- 27, 2026   Dec 3, 2026 Review “Semestersprecherraum” 14:00 1 hour   Dec 3, 2026 Retrospective “Semestersprecherraum” 15:30 30min 5\. Sprint: Dec 3 – 16, 2026   Milestone 2: Second Presentation: Dec 3, 2026   Planning Poker & Sprint Planning: Dec 6, 2026   Dailies: Dec 7, 2026 13:00 Online 20 Minutes Dec 9, 2026 14:00 Online 20 Minutes Dec 10, 2026 \[variable\] 14:00 “Semestersprecherraum” 20 Minutes Dec 14, 2026 13:00 Online 20 Minutes Dec 16, 2026 14:00 Online 20 Minutes   Dec 17, 2026 Review “Semestersprecherraum” 14:00 1 hour   Dec 17, 2026 Retrospective “Semestersprecherraum” 15:30 30min Holiday Break 7\. Sprint: Dec 31, 2026 – Jan 13, 2027   Planning Poker & Sprint Planning: Jan 3, 2027   Dailies: Jan 4, 2027 13:00 Online 20 Minutes Jan 6, 2027 14:00 Online 20 Minutes Jan 7, 2027 \[variable\] 14:00 “Semestersprecherraum” 20 Minutes Jan 11, 2027 13:00 Online 20 Minutes Jan 13, 2027 14:00 Online 20 Minutes   Milestone 3: Final Presentation: Jan 14, 2027   Jan 14, 2027 Review “Semestersprecherraum” 14:00 1 hour   Jan 14, 2027 Retrospective “Semestersprecherraum” 15:30 30min To make sure tasks and effort are distributed fairly, the time invested on an issue by a given person is tracked in GitLab and reflected on during the retrospectives. For this, there is a wiki page on GitLab called “Time Investment” where every developer writes down the amount of time they worked on an issue, linking to it. |
| :---- |
|  |


  

6. # **Informing the Clients** {#informing-the-clients}

1. ###  **Client Communication** {#client-communication}

   1. **Daily Scrums:** The client is invited to our daily meetings. This provides them with unfiltered insights into the daily progress, current challenges (blockers), and next steps. 

   2. **Real-Time Insights:** Through direct GitLab access, the client can view the status of every feature on the Issue Board (Scrum Board) at any time. 

   3. **Sprint Reviews:** At the end of each sprint, the completed increments are presented. 

2. ###  **Utilization and Structure of Gitlab** {#utilization-and-structure-of-gitlab}

   1. **Issue Boards (Scrum Boards):** We set up a board that reflects our Scrum workflow. The columns (lists) are defined: *Open*, *To Do* (Sprint Backlog), *In Progress*, *In Review* (Code/Peer Review), and *Closed*. 

   2. **Issues as User Stories:** Tasks are not formulated as technical  fragments, but as comprehensible User Stories (e.g., *"As a user, I want to..."*). Each issue contains clear Acceptance Criteria *written in the Issue Description*. This way, the client knows exactly when a task is considered finished (Definition of Done). 

   3.  **Consistent Labeling System:**   
> > > > > > - **Type:** Type::Feature, Type::Bug  
> > > > > > - **Status:** Status::done, Status::ready for development, Status::closed, Status::review, Status::rework,

  4.  **Communication within Issues:** Technical discussion takes place in the comments of the Gitlab issues. This prevents information loss.

3. ### **Design and Structure of the Wiki** {#design-and-structure-of-the-wiki}

1. **Home Page** 

   The home page welcomes the client and serves as a table of contents and guide. The following elements are on the home page: 

1. Group Picture of our Team  
   1. Short description of the Team and Quick Link to a Side that includes which Scrum role is taking places and a introduction of each team member

2. Quick Links

3. Project Vision

4. Project description  
2. **Wiki Structure** (Navigation/Sidebar)

1. Project Organization  
   1. Agile Workflow (Scrum meetings: Daily, Planning, Review, Retro).

2. Controlling & Status  
   1. Explanation of time tracking in GitLab.   
   2. Time tracking of self engagement ?

3. Technical Documentation  
   1. Deployment process?

4. Usability Testing  
   1. Protocols  
   2. Ergebnisse?

7. # **Stakeholder and Project Organisation** {#stakeholder-and-project-organisation}

   

| Project Client: Prof. Dr. Nicola Marsden, Prof. Dr. Thomas Fankhauser, Yvonne Tang The Project Client provides the project requirements and gives feedback on the results. Scrum Master: Kevin Schönmayer The Scrum Master organizes Scrum meetings, supports the team and helps solve problems during the project. Product Owner: Viola Eistetter The Project Owner manages and prioritizes the product backlog and makes sure the project meets the requirements. Development Team: Jacqueline Andrä Kevin Schönmayer Viola Eistetter Philip Reimann Phoebe Ziegler The developers are responsible for implementing, testing and documenting the application. They work together on the user stories and complete the tasks during each sprint. |
| :---- |

 


 


8. **Approval**

   

| List the individuals/functions whose signatures are relevant for project approval (both from the client and contractor sides). Please remove this comment from your document. |
| :---- |

   

   

   

| Client |  | Date |
| :---- | :---- | :---- |
| Client |  | Date |
| Client |  | Date |
| Scrum Master |  | Date |
| Product Owner |  | Date |

   

   

   

   

   

   

   

   