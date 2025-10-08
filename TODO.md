add todo list quote: add to config agant_master_rule eg concentrate and folllow elementes and pages that releated to given flow, use apprioprate suggestions to proceed. do not proceed with following flows list \

Along with current solution I need new script: identify-workflows, it should analyze  maps.json file form specifiec session directory eg out/session_2025-10-02T04-17-22__demo.realworld.show/map.json , it should:
1. find distinct user journeys  and use cases that are in this file, eg sing up, login posting article, update settings, like an article etc - everyting which ends with an outcome for the user
2. build list of them
3. sort use case from the simplest to more complicated
4.  provide result in form of table with
columns:
 user journey name, use case name, 
steps_ids - id of steps ,
actions: page_name.area_name(action)->page_name.area_name(action)
 inputs, outputs, comment