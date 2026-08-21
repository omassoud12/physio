import assert from 'node:assert/strict';
import test from 'node:test';
import { validateNeckAssessmentData } from '../src/services/neckAssessmentService.js';

const completeShape={
  inspection:{staticFindings:[],dynamicFindings:[],notes:''},
  palpation:{locations:{},notes:''},
  articular:{movements:{},movementQuality:[],endFeel:'',segmentalMobility:{},notes:''},
  muscular:{mmt:{},deepNeckFlexor:'',muscleLength:[],muscleControl:[],notes:''},
  neurological:{sensory:{},myotomes:{},reflexes:{},reflexComparison:'',notes:''},
  radicular:{tests:{},notes:''},
  umnScreen:{tests:{},myelopathySymptoms:[],notes:''},
  vascularScreen:{indicated:null,symptoms:[],notes:''},
  functional:{activities:{},tasks:{},notes:''},
  motorControl:{tests:{},notes:''},
  specialTests:{pathways:[],showFull:false,tests:{},notes:''},
  outcomeMeasure:{ndi:'',psfs:[{activity:'',score:''},{activity:'',score:''},{activity:'',score:''}],notes:''},
  clinicalReasoning:{mainHypothesis:'',differentialDiagnosis:[],supportingFindings:[],againstFindings:[],testsNeeded:[],interpretation:''},
};

test('accepts the complete cervical assessment schema',()=>{
  assert.equal(validateNeckAssessmentData(completeShape,{completed:true}),completeShape);
});

test('validates cervical clinical ranges',()=>{
  assert.throws(()=>validateNeckAssessmentData({...completeShape,palpation:{locations:{c1:{tenderness:4,findings:[]}},notes:''}}),/between 0 and 3/);
  assert.throws(()=>validateNeckAssessmentData({...completeShape,muscular:{...completeShape.muscular,mmt:{cervical_flexors:{right:6,left:5,pain:false}}}}),/between 0 and 5/);
  assert.throws(()=>validateNeckAssessmentData({...completeShape,articular:{...completeShape.articular,movements:{rotation_right:{arom:181,prom:90,pain:false,limitation:false}}}}),/between 0 and 180/);
  assert.throws(()=>validateNeckAssessmentData({...completeShape,outcomeMeasure:{...completeShape.outcomeMeasure,ndi:51}}),/between 0 and 50/);
  assert.throws(()=>validateNeckAssessmentData({...completeShape,outcomeMeasure:{...completeShape.outcomeMeasure,psfs:[{activity:'Driving',score:11}]}}),/between 0 and 10/);
});

test('accepts safety findings without generating a diagnosis',()=>{
  const data={...completeShape,umnScreen:{tests:{hoffmann:'positive',gait:'abnormal'},myelopathySymptoms:['hand_clumsiness'],notes:''},vascularScreen:{indicated:true,symptoms:['dizziness','diplopia'],notes:''}};
  assert.equal(validateNeckAssessmentData(data),data);
  assert.equal('diagnosis' in data,false);
});

test('allows only known cervical pathways and special tests',()=>{
  assert.doesNotThrow(()=>validateNeckAssessmentData({...completeShape,specialTests:{pathways:['radicular'],showFull:false,tests:{spurling:'positive',ultt1:'negative'},notes:''}}));
  assert.throws(()=>validateNeckAssessmentData({...completeShape,specialTests:{pathways:['invented'],showFull:false,tests:{},notes:''}}),/invalid selections/);
  assert.throws(()=>validateNeckAssessmentData({...completeShape,specialTests:{pathways:[],showFull:false,tests:{invented_test:'positive'},notes:''}}),/unsupported/);
});

test('requires all thirteen cervical sections before completion',()=>{
  const{vascularScreen,...incomplete}=completeShape;
  assert.equal(vascularScreen.indicated,null);
  assert.throws(()=>validateNeckAssessmentData(incomplete,{completed:true}),/All assessment sections/);
});
