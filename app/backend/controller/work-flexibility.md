1. department-controller.js

- add_department (sorted)
- format_workflow_step
- edit_department
- formatWorkflowStep

2. log-controller.js

- addLog

3. process-description-controller.js

- get_process_history

4. process-utility-controller.js

- is_process_forwardable

5. process-controller.js

- add_process
- sendEmail
- get_process_for_user
- get_user_notifications_for_processes
- send_process_to_clerk_for_work
- end_process

MODEL LEVEL CHANGES

1. department.js -> steps
2. log.js -> currentStep, nextStep
3. process.js -> (rejection --> step), steps
4. user.js -> processes

/addDepartment
/editDepartment/:id
/getProcessHistory
/addProcess
/getProcessesForUser
/getUserProcessNotifications
/sendToClerk/:id
/endProcess/:id
