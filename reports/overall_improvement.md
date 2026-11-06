TaskFlow — Time and Space Complexity Report
1. Objective

The objective was to analyze the time and space complexity of TaskFlow, measure its performance, identify issues, and compare results before and after fixing the issue.

2. Testing Process

The following workflow was tested five times:

Login
Open dashboard
Open boards
Create a board
Create a task
Edit and save the task
Delete the task and board

Technology used: React, Node.js, Express, MongoDB, and Playwright.

3. Before vs. After Performance

The table shows the median time for each operation.

Operation	        Before (ms)	    After (ms)
Open landing page	1592	        1423
Login	            560	            487
Load dashboard	    352	            298
Open boards	        566	            518
Create board	    741	            676
Open board	        999	            1077
Create task	        913	            876
Open task	        298	            298
Edit task	        Failed	        1178
Delete task	        675	            641
Delete board	    842	            969

Improvement = 3.18%

Result: Before the fix, task editing failed in all five tests because of a JavaScript error. After fixing it, all five tests passed. Some operations became faster, while others became slower. No dedicated performance optimization was made, so these timing differences do not prove an overall performance improvement.